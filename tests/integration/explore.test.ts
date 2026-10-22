// Integration: Explore queries (filters, sorts, keyset paging, search, facets, new-since) on a known dataset in coastal_test.
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "@/lib/db/types";
import { DEFAULT_QUERY, type FeedQuery } from "@/lib/feed/query";
import { exploreCount, exploreFacets, explorePage, exploreNewCount } from "@/lib/feed/explore";
import { TEST_DB_URL, requireDb } from "./db";

let pool: Pool;
let db: Kysely<Database>;
let reachable = false;
let A = "";            // journal slugs used by the fixtures
let B = "";
const ids: Record<string, string> = {};

const q = (over: Partial<FeedQuery>): FeedQuery => ({ ...DEFAULT_QUERY, ...over });
const titles = (rows: { title: string }[]) => rows.map((r) => r.title);

async function seed() {
  const j = await pool.query(`select id, slug from journals where not is_preprint_server order by sort_order limit 2`);
  const pre = await pool.query(`select id from journals where abbreviation = 'arXiv'`);
  [A, B] = [j.rows[0].slug, j.rows[1].slug];
  const jid = { A: j.rows[0].id, B: j.rows[1].id, X: pre.rows[0].id };
  const region = async (slug: string) => (await pool.query(`select id from regions where slug = $1`, [slug])).rows[0].id as number;
  const mumbai = [await region("mumbai"), await region("india"), await region("south-asia")];
  const india = [await region("india"), await region("south-asia")];
  const rows: [string, string, number, number[], number[], keyof typeof jid, boolean, boolean, number, number, string | null][] = [
    // key, title, days ago, topics, regions, journal, oa, preprint, cited, trending, abstract
    ["p1", "Storm surge flooding in Mumbai harbour", 1, [9], mumbai, "A", true, false, 5, 0.5, "Tide gauges and surge."],
    ["p2", "Subsidence of the Ganges delta", 3, [4], [], "B", false, false, 50, 2.0, "We also discuss storm surge exposure."],
    ["p3", "River hydrology under the Indian monsoon", 10, [13], india, "X", true, true, 0, 0.1, null],
    ["p4", "Groundwater subsidence and flood risk", 20, [4, 9], [], "B", true, false, 50, 2.0, null],
    ["p5", "An older study of storm surge statistics", 200, [9], [], "A", false, false, 7, 0.2, null],
    ["p6", "Preprint version of storm surge flooding in Mumbai", 2, [9], mumbai, "X", true, true, 0, 0, null],
  ];
  for (const [key, title, ago, topics, regions, jr, oa, preprint, cited, trend, abstract] of rows) {
    const r = await pool.query(
      `insert into papers (doi, title, abstract, journal_id, pub_date, first_seen_at, topic_ids, region_ids, is_oa, is_preprint, cited_by_count, trending_score, authors_display)
       values ($1, $2, $3, $4, current_date - $5::int, now() - make_interval(days => $5::int), $6, $7, $8, $9, $10, $11, 'Test, A.') returning id`,
      [`10.99999/explore-${key}`, title, abstract, jid[jr], ago, topics, regions, oa, preprint, cited, trend]);
    ids[key] = r.rows[0].id;
  }
  await pool.query(`update papers set published_version_id = $1 where id = $2`, [ids.p1, ids.p6]);   // p6 is p1's preprint: hidden
}

beforeAll(async () => {
  pool = new Pool({ connectionString: TEST_DB_URL, max: 3, connectionTimeoutMillis: 1500 });
  const name = await pool.query("select current_database() as db").then((r) => r.rows[0].db as string, () => "");
  reachable = requireDb(name === "coastal_test");           // never wipe papers anywhere else
  if (!reachable) return;
  await pool.query("delete from papers");
  db = new Kysely<Database>({ dialect: new PostgresDialect({ pool }) });
  await seed();
});
afterAll(async () => {
  if (reachable) await pool.query("delete from papers");
  await pool.end();
});

describe("explorePage: window and filters", () => {
  test("default: last 30 days, newest first, linked preprints hidden", async () => {
    if (!reachable) return;
    const { papers } = await explorePage(db, q({}), null);
    expect(titles(papers)).toEqual([
      "Storm surge flooding in Mumbai harbour", "Subsidence of the Ganges delta",
      "River hydrology under the Indian monsoon", "Groundwater subsidence and flood risk"]);
  });
  test("days narrows the window", async () => {
    if (!reachable) return;
    expect((await explorePage(db, q({ days: 7 }), null)).papers).toHaveLength(2);
  });
  test("topics match any selected topic; filters across facets combine", async () => {
    if (!reachable) return;
    expect(titles((await explorePage(db, q({ topics: ["subsidence", "hydrology"] }), null)).papers))
      .toEqual(["Subsidence of the Ganges delta", "River hydrology under the Indian monsoon", "Groundwater subsidence and flood risk"]);
    expect(titles((await explorePage(db, q({ topics: ["subsidence", "hydrology"], regions: ["south-asia"] }), null)).papers))
      .toEqual(["River hydrology under the Indian monsoon"]);
  });
  test("a parent region includes papers tagged with its places", async () => {
    if (!reachable) return;
    expect(titles((await explorePage(db, q({ regions: ["india"] }), null)).papers))
      .toEqual(["Storm surge flooding in Mumbai harbour", "River hydrology under the Indian monsoon"]);
  });
  test("journal, open access and preprint filters", async () => {
    if (!reachable) return;
    expect((await explorePage(db, q({ journals: [B] }), null)).papers).toHaveLength(2);
    expect((await explorePage(db, q({ oaOnly: true }), null)).papers).toHaveLength(3);
    expect(titles((await explorePage(db, q({ preprints: false }), null)).papers)).not.toContain("River hydrology under the Indian monsoon");
  });
  test("an unknown slug matches nothing instead of being ignored", async () => {
    if (!reachable) return;
    expect((await explorePage(db, q({ journals: ["no-such-journal"] }), null)).papers).toEqual([]);
  });
});

describe("explorePage: sorts and keyset paging", () => {
  test.each([
    ["old", ["Groundwater subsidence and flood risk", "River hydrology under the Indian monsoon", "Subsidence of the Ganges delta", "Storm surge flooding in Mumbai harbour"]],
    ["cited", ["Subsidence of the Ganges delta", "Groundwater subsidence and flood risk", "Storm surge flooding in Mumbai harbour", "River hydrology under the Indian monsoon"]],
    ["trending", ["Subsidence of the Ganges delta", "Groundwater subsidence and flood risk", "Storm surge flooding in Mumbai harbour", "River hydrology under the Indian monsoon"]],
  ] as const)("sort=%s orders correctly (ties broken by id)", async (sort, expected) => {
    if (!reachable) return;
    const got = titles((await explorePage(db, q({ sort }), null)).papers);
    expect(new Set(got.slice(0, 2))).toEqual(new Set(expected.slice(0, 2)));    // the tied pair, in id order
    expect(got.slice(2)).toEqual(expected.slice(2));
  });
  test.each(["new", "old", "cited", "trending"] as const)("sort=%s pages through everything exactly once with page size 1", async (sort) => {
    if (!reachable) return;
    const all = titles((await explorePage(db, q({ sort }), null)).papers);
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let i = 0; i < 10; i++) {
      const page: { papers: { title: string }[]; nextCursor: string | null } = await explorePage(db, q({ sort }), cursor, { limit: 1 });
      seen.push(...titles(page.papers));
      cursor = page.nextCursor;
      if (!cursor) break;
    }
    expect(seen).toEqual(all);
  });
  test("a cursor from another sort is rejected, not misread", async () => {
    if (!reachable) return;
    const first = await explorePage(db, q({ sort: "cited" }), null, { limit: 1 });
    expect((await explorePage(db, q({ sort: "new" }), first.nextCursor)).papers).toEqual([]);
  });
});

describe("search", () => {
  test("matches title, abstract and authors; title matches rank first; ignores the time window", async () => {
    if (!reachable) return;
    const { papers } = await explorePage(db, q({ q: "storm surge", sort: "relevance" }), null);
    expect(titles(papers)[0]).toBe("Storm surge flooding in Mumbai harbour");
    expect(titles(papers)).toContain("An older study of storm surge statistics");     // 200 days old
    expect(titles(papers)).toContain("Subsidence of the Ganges delta");               // abstract only
    expect(titles(papers).indexOf("Subsidence of the Ganges delta")).toBe(papers.length - 1);
  });
  test("returns highlighted snippets with only <mark> tags, escaping everything else", async () => {
    if (!reachable) return;
    await pool.query(`update papers set title = 'Surge <script>alert(1)</script> & tides' where id = $1`, [ids.p5]);
    const { papers } = await explorePage(db, q({ q: "surge", sort: "relevance" }), null);
    const hit = papers.find((p) => p.id === ids.p5)!;
    expect(hit.titleHtml).toContain("<mark>Surge</mark>");
    expect(hit.titleHtml).toContain("&lt;script&gt;");
    expect(hit.titleHtml).not.toMatch(/<(?!\/?mark>)/);
    await pool.query(`update papers set title = 'An older study of storm surge statistics' where id = $1`, [ids.p5]);
  });
  test("relevance results page with a cursor too", async () => {
    if (!reachable) return;
    const first = await explorePage(db, q({ q: "storm surge", sort: "relevance" }), null, { limit: 2 });
    const second = await explorePage(db, q({ q: "storm surge", sort: "relevance" }), first.nextCursor, { limit: 2 });
    expect(new Set([...titles(first.papers), ...titles(second.papers)]).size).toBe(first.papers.length + second.papers.length);
  });
  test("a query of only punctuation returns nothing rather than everything", async () => {
    if (!reachable) return;
    expect((await explorePage(db, q({ q: "!!! &&" }), null)).papers).toEqual([]);
  });
});

describe("new only", () => {
  test("since limits the page to papers first seen after it, keeping the other filters", async () => {
    if (!reachable) return;
    const since = new Date(Date.now() - 5 * 86_400_000);
    expect(titles((await explorePage(db, q({}), null, { since })).papers)).toEqual(["Storm surge flooding in Mumbai harbour", "Subsidence of the Ganges delta"]);
    expect(titles((await explorePage(db, q({ topics: ["subsidence"] }), null, { since })).papers)).toEqual(["Subsidence of the Ganges delta"]);
  });
});

describe("counts", () => {
  test("exploreCount matches the filtered total", async () => {
    if (!reachable) return;
    expect(await exploreCount(db, q({}))).toBe(4);
    expect(await exploreCount(db, q({ oaOnly: true }))).toBe(3);
  });
  test("facet counts ignore their own facet but apply the others", async () => {
    if (!reachable) return;
    const f = await exploreFacets(db, q({ topics: ["subsidence"], oaOnly: true }));
    expect(f.topics["flood-risk"]).toBe(2);              // p1, p4 (oa), topic filter ignored for topic counts
    expect(f.topics["subsidence"]).toBe(1);              // p4
    expect(f.oa).toBe(1);                                 // subsidence papers that are OA: p4 (the oa facet ignores oaOnly itself)
    const journals = Object.fromEntries(f.journals.map((j) => [j.slug, j.count]));
    expect(journals[B]).toBe(1);                         // p4 (subsidence, oa)
    expect(f.journals.length).toBeGreaterThan(100);      // every journal is listed, zero counts included
  });
  test("new since a moment counts only papers first seen after it, under the same filters", async () => {
    if (!reachable) return;
    const since = new Date(Date.now() - 5 * 86_400_000);
    expect(await exploreNewCount(db, q({}), since)).toBe(2);               // p1, p2
    expect(await exploreNewCount(db, q({ topics: ["subsidence"] }), since)).toBe(1);
  });
});
