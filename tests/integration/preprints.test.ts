// Integration: preprint ingest (arXiv, ESSOAr, EarthArXiv) against the local Postgres with stubbed servers.
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { ingestPreprints, linkPublishedVersions } from "@/lib/ingest/preprints";

const DB_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:55433/coastal";
const fx = (name: string) => readFileSync(new URL(`../unit/fixtures/${name}`, import.meta.url), "utf8");
const ON_TOPIC = "Compound flooding from storm surge and river discharge in the Ganges delta";

// One record per server is rewritten to pass the strict gate; the rest are left as fetched.
const arxivXml = fx("arxiv-feed.xml").replace(/<title>Disentangling[^<]*<\/title>/, `<title>${ON_TOPIC}</title>`);
const crossref = JSON.parse(fx("crossref-essoar.json"));
crossref.message.items[0].title = [`${ON_TOPIC} (ESSOAr)`];
const crossrefEmpty = { status: "ok", message: { items: [], "next-cursor": "END" } };
const oaiXml = fx("eartharxiv-oai.xml")
  .replace("Soil Seed Banks of Invasive Plant Species of the Lower Mississippi River Delta", `${ON_TOPIC} (EarthArXiv)`)
  .replace(/<resumptionToken[^>]*>[\s\S]*?<\/resumptionToken>/, "<resumptionToken completeListSize=\"3\"/>");

function stub(): { fetchFn: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  const fetchFn = (async (input: string | URL | Request) => {
    const u = String(input);
    urls.push(u);
    const xml = (body: string) => new Response(body, { status: 200, headers: { "content-type": "application/xml" } });
    if (u.includes("export.arxiv.org")) return xml(u.includes("start=0") ? arxivXml : "<feed xmlns='http://www.w3.org/2005/Atom'></feed>");
    if (u.includes("api.crossref.org")) return Response.json(u.includes("cursor=CURSOR2") ? crossrefEmpty : crossref);
    if (u.includes("eartharxiv.org")) return xml(oaiXml);
    return new Response("not stubbed", { status: 404 });
  }) as typeof fetch;
  return { fetchFn, urls };
}

const now = new Date("2026-10-21T09:00:00Z");
const base = (fetchFn: typeof fetch) => ({ pool, servers: ["arxiv", "essoar", "eartharxiv"] as const, fromDate: "2026-08-01", now, fetchFn, sleep: async () => {} });

let pool: Pool;
let reachable = false;
const cleanup = async () => {
  await pool.query(`delete from papers where journal_id in (select id from journals where is_preprint_server)`);
  await pool.query(`delete from preprint_ledger`);
  await pool.query(`delete from papers where doi = '10.9999/test.published.1'`);
  await pool.query(`delete from job_runs where job = 'ingest_preprints' and run_key like 'ingest_preprints:2026-10-21T09'`);
};
beforeAll(async () => {
  pool = new Pool({ connectionString: DB_URL, max: 3, connectionTimeoutMillis: 1500 });
  reachable = await pool.query("select to_regclass('public.preprint_ledger') is not null as ok").then((r) => r.rows[0].ok, () => false);
});
afterAll(async () => { if (reachable) await cleanup(); await pool.end(); });
beforeEach(async () => { if (reachable) await cleanup(); });

describe("ingestPreprints (local db)", () => {
  test("ledgers every record and stores only those that pass the strict gate", async () => {
    if (!reachable) return;
    const stats = await ingestPreprints(base(stub().fetchFn));
    expect(stats.arxiv?.fetched).toBe(3);
    expect(stats.essoar?.fetched).toBe(2);
    expect(stats.eartharxiv?.fetched).toBe(3);
    const ledger = await pool.query(
      `select server, count(*)::int as n, count(*) filter (where classified)::int as kept from preprint_ledger group by 1 order by 1`);
    expect(ledger.rows.map((r) => [r.server, r.n])).toEqual([["arxiv", 3], ["eartharxiv", 3], ["essoar", 2]]);
    expect(ledger.rows.map((r) => r.kept)).toEqual([stats.arxiv?.classified, stats.eartharxiv?.classified, stats.essoar?.classified]);
    const offTopic = await pool.query(`select count(*)::int as n from papers where title in ('Soil Seed Banks of Invasive Plant Species of the Lower Mississippi River Delta',
      'The seasonal, polar-amplified climate response to a latent heat transport forcing')`);
    expect(offTopic.rows[0].n).toBe(0);
    const papers = await pool.query(
      `select p.is_preprint, p.is_oa, p.abstract_source, p.arxiv_id, j.abbreviation from papers p join journals j on j.id = p.journal_id
       where j.is_preprint_server and p.title like $1 order by j.abbreviation`, [`${ON_TOPIC}%`]);
    expect(papers.rows).toEqual([
      { is_preprint: true, is_oa: true, abstract_source: "arxiv", arxiv_id: "2610.28219", abbreviation: "arXiv" },
      { is_preprint: true, is_oa: true, abstract_source: "oai", arxiv_id: null, abbreviation: "EarthArXiv" },
      { is_preprint: true, is_oa: true, abstract_source: "crossref", arxiv_id: null, abbreviation: "ESSOAr" },
    ]);
  });

  test("is idempotent: a second run adds no rows", async () => {
    if (!reachable) return;
    const count = async () => (await pool.query(
      `select count(*)::int as n from papers p join journals j on j.id = p.journal_id where j.is_preprint_server`)).rows[0].n;
    await ingestPreprints(base(stub().fetchFn));
    const first = await count();
    await ingestPreprints(base(stub().fetchFn));
    expect(await count()).toBe(first);
    expect(first).toBeGreaterThanOrEqual(3);
  });

  test("pages each server until it runs out, politely spaced", async () => {
    if (!reachable) return;
    const { fetchFn, urls } = stub();
    const waits: number[] = [];
    await ingestPreprints({ ...base(fetchFn), sleep: async (ms: number) => { waits.push(ms); } });
    expect(urls.filter((u) => u.includes("api.crossref.org"))).toHaveLength(2);       // first page + cursor page
    expect(urls.filter((u) => u.includes("eartharxiv.org"))).toHaveLength(1);         // no resumption token
    expect(waits.filter((ms) => ms >= 3000).length).toBeGreaterThanOrEqual(1);        // arXiv: 1 request per 3 s
  });

  test("one failing server does not stop the others", async () => {
    if (!reachable) return;
    const { fetchFn } = stub();
    const flaky = (async (u: string | URL | Request) =>
      String(u).includes("api.crossref.org") ? new Response("down", { status: 400 }) : fetchFn(u)) as typeof fetch;
    const stats = await ingestPreprints(base(flaky));
    expect(stats.essoar?.error).toMatch(/400/);
    expect(stats.arxiv?.classified).toBeGreaterThanOrEqual(1);
    expect(stats.eartharxiv?.classified).toBeGreaterThanOrEqual(1);
  });
});

describe("linkPublishedVersions (local db)", () => {
  test("links a preprint to the journal paper with the same title, which hides it from the feed", async () => {
    if (!reachable) return;
    await ingestPreprints(base(stub().fetchFn));
    const journal = await pool.query(`select id from journals where not is_preprint_server limit 1`);
    await pool.query(
      `insert into papers (doi, title, journal_id, pub_date, topic_ids) values ('10.9999/test.published.1', $1, $2, '2026-10-15', '{1}')`,
      [`${ON_TOPIC.toUpperCase()}!`, journal.rows[0].id]);
    const linked = await linkPublishedVersions(pool);
    expect(linked).toBe(1);
    const pre = await pool.query(`select p.published_version_id is not null as linked from papers p join journals j on j.id = p.journal_id where j.abbreviation = 'arXiv' and p.title = $1`, [ON_TOPIC]);
    expect(pre.rows[0].linked).toBe(true);
  });
});
