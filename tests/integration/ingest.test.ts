// Integration: ingestPapers against the local Postgres (npm run db:local) with a stubbed OpenAlex.
// Each test returns early when the local database is not reachable.
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Pool } from "pg";
import { TEST_DB_URL } from "./db";
import { readFileSync } from "node:fs";
import { ingestPapers } from "@/lib/ingest/papers";

const DB_URL = TEST_DB_URL;
const NHESS = "S70708404";
const FIXTURE_IDS = ["W4415000001", "W4415000002"];
const work = JSON.parse(readFileSync(new URL("../unit/fixtures/openalex-work.json", import.meta.url), "utf8"));
const offTopic = { ...work, id: "https://openalex.org/W4415000002", doi: "https://doi.org/10.99999/fixture-nhess-9999",
  title: "A survey of medieval manuscript bindings", abstract_inverted_index: { Bindings: [0], vary: [1] } };

function page(results: unknown[], status = 200): Response {
  return new Response(JSON.stringify({ meta: { next_cursor: null }, results }), {
    status, headers: { "content-type": "application/json", "x-ratelimit-cost-usd": "0.0001", "x-ratelimit-remaining-usd": "0.9" } });
}

let pool: Pool;
let reachable = false;

beforeAll(async () => {
  pool = new Pool({ connectionString: DB_URL, max: 3, connectionTimeoutMillis: 1500 });
  reachable = await pool.query("select 1").then(() => true, () => false);
});
afterAll(async () => { await pool.end(); });
beforeEach(async () => {
  if (!reachable) return;
  await pool.query("delete from papers where openalex_id = any($1)", [FIXTURE_IDS]);
  await pool.query("delete from paper_ledger where openalex_id = any($1)", [FIXTURE_IDS]);
  await pool.query("delete from job_runs where job = 'ingest_papers' and run_key like 'ingest_papers:2030-%'");
});

const now = new Date("2030-01-01T09:00:00Z");
const base = () => ({ pool, journalOpenalexIds: [NHESS], fromPublicationDate: "2029-11-17", now, sleep: async () => {} });

describe("ingestPapers (local db)", () => {
  test("ledgers every work and stores only classified papers", async () => {
    if (!reachable) return;
    const stats = await ingestPapers({ ...base(), fetchFn: async () => page([work, offTopic]) });
    expect(stats).toMatchObject({ fetched: 2, classified: 1, pages: 1 });
    const ledger = await pool.query("select openalex_id, classified from paper_ledger where openalex_id = any($1) order by 1", [FIXTURE_IDS]);
    expect(ledger.rows).toEqual([{ openalex_id: "W4415000001", classified: true }, { openalex_id: "W4415000002", classified: false }]);
    const paper = await pool.query("select doi, topic_ids, region_ids from papers where openalex_id = 'W4415000001'");
    expect(paper.rows[0].doi).toBe("10.99999/fixture-nhess-5119");
    expect(paper.rows[0].topic_ids.length).toBeGreaterThan(0);
    expect(paper.rows[0].region_ids).toEqual(expect.arrayContaining([12, 13, 14]));   // Mumbai -> India -> South Asia
  });

  test("a second run in the same hour succeeds as a new attempt and is idempotent", async () => {
    if (!reachable) return;
    await ingestPapers({ ...base(), fetchFn: async () => page([work]) });
    const again = await ingestPapers({ ...base(), fetchFn: async () => page([work]) });
    expect(again.classified).toBe(1);
    const runs = await pool.query("select attempt, status from job_runs where run_key = 'ingest_papers:2030-01-01T09' order by attempt");
    expect(runs.rows).toEqual([{ attempt: 1, status: "succeeded" }, { attempt: 2, status: "succeeded" }]);
    const n = await pool.query("select count(*)::int as n from papers where openalex_id = 'W4415000001'");
    expect(n.rows[0].n).toBe(1);
  });

  test("retries a 5xx and then succeeds", async () => {
    if (!reachable) return;
    let calls = 0;
    const stats = await ingestPapers({ ...base(), fetchFn: async () => (++calls === 1 ? page([], 503) : page([work])) });
    expect(calls).toBe(2);
    expect(stats.classified).toBe(1);
  });

  test("a second OpenAlex record with the same DOI is ledgered as a duplicate and does not fail the run", async () => {
    if (!reachable) return;
    const twin = { ...work, id: "https://openalex.org/W4415000002" };          // same DOI, different work id
    const stats = await ingestPapers({ ...base(), fetchFn: async () => page([work, twin]) });
    expect(stats).toMatchObject({ fetched: 2, classified: 1, duplicates: 1 });
    const n = await pool.query("select count(*)::int as n from papers where doi = '10.99999/fixture-nhess-5119'");
    expect(n.rows[0].n).toBe(1);
  });

  test("retries a network error (thrown fetch) and then succeeds", async () => {
    if (!reachable) return;
    let calls = 0;
    const stats = await ingestPapers({ ...base(), fetchFn: async () => { if (++calls === 1) throw new TypeError("fetch failed"); return page([work]); } });
    expect(calls).toBe(2);
    expect(stats.classified).toBe(1);
  });

  test("records a failed run and releases its connection when OpenAlex keeps failing", async () => {
    if (!reachable) return;
    await expect(ingestPapers({ ...base(), fetchFn: async () => page([], 429) })).rejects.toThrow(/429/);
    const run = await pool.query("select status from job_runs where run_key = 'ingest_papers:2030-01-01T09' order by started_at desc limit 1");
    expect(run.rows[0].status).toBe("failed");
    expect(pool.totalCount - pool.idleCount).toBe(0);           // nothing left checked out
  });
});
