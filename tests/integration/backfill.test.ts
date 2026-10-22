// Integration: windowed, batched backfill against the local Postgres with a stubbed OpenAlex.
import { describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Pool } from "pg";
import { TEST_DB_URL } from "./db";
import { readFileSync } from "node:fs";
import { ingestPapers } from "@/lib/ingest/papers";
import { runBackfill } from "@/lib/ingest/run-backfill";

const DB_URL = TEST_DB_URL;
const NHESS = "S70708404";
const CE = "S71934726";
const FIXTURE_IDS = ["W4415000001"];
const work = JSON.parse(readFileSync(new URL("../unit/fixtures/openalex-work.json", import.meta.url), "utf8"));

function page(results: unknown[], extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ meta: { next_cursor: null }, results }), {
    status: 200, headers: { "content-type": "application/json", "x-ratelimit-cost-usd": "0.0001", "x-ratelimit-remaining-usd": "0.09", "x-ratelimit-limit-usd": "0.1", ...extra } });
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
  await pool.query("delete from job_runs where job = 'test_backfill_papers' and run_key like 'test_backfill_papers:2030-%'");
});

const now = new Date("2030-03-10T09:00:00Z");
const JOB = "test_backfill_papers";
const windows = [{ key: "2030-03", from: "2030-03-01", to: "2030-03-10" }, { key: "2030-02", from: "2030-02-01", to: "2030-02-28" }];

describe("windowed ingest (local db)", () => {
  test("sends the window end, uses the given batches, and logs under the given job and run key", async () => {
    if (!reachable) return;
    const urls: string[] = [];
    await ingestPapers({ pool, batches: [[NHESS], [CE]], fromPublicationDate: "2030-02-01", toPublicationDate: "2030-02-28",
      job: "test_backfill_papers", runKey: "test_backfill_papers:2030-02", now, sleep: async () => {},
      fetchFn: async (u) => { urls.push(String(u)); return page([work]); } });
    expect(urls).toHaveLength(2);
    expect(decodeURIComponent(urls[0])).toContain(`source.id:${NHESS},from_publication_date:2030-02-01,to_publication_date:2030-02-28`);
    expect(decodeURIComponent(urls[1])).toContain(`source.id:${CE},`);
    const run = await pool.query("select status from job_runs where job = 'test_backfill_papers' and run_key = 'test_backfill_papers:2030-02'");
    expect(run.rows).toEqual([{ status: "succeeded" }]);
  });

  test("flags a truncated run when keyless paging reaches the page cap", async () => {
    if (!reachable) return;
    const full = Array.from({ length: 100 }, () => work);
    const stats = await ingestPapers({ pool, batches: [[NHESS]], fromPublicationDate: "2030-02-01", maxKeylessPages: 2,
      job: "test_backfill_papers", runKey: "test_backfill_papers:2030-02", now, sleep: async () => {}, fetchFn: async () => page(full) });
    expect(stats.truncated).toBe(true);
    expect(stats.pages).toBe(2);
  });
});

describe("runBackfill (local db)", () => {
  test("runs every window once, then skips completed windows on a rerun", async () => {
    if (!reachable) return;
    let calls = 0;
    const opts = { pool, job: JOB, windows, batches: [[NHESS]], now, sleep: async () => {}, fetchFn: async () => { calls++; return page([work]); } };
    const first = await runBackfill(opts);
    expect(first.done).toEqual(["2030-03", "2030-02"]);
    expect(calls).toBe(2);
    const second = await runBackfill(opts);
    expect(second.skipped).toEqual(["2030-03", "2030-02"]);
    expect(calls).toBe(2);
  });

  test("stops at the budget cap and leaves the unfinished window for the next run", async () => {
    if (!reachable) return;
    const broke = { "x-ratelimit-remaining-usd": "0.001", "x-ratelimit-limit-usd": "0.1" };
    const res = await runBackfill({ pool, job: JOB, windows, batches: [[NHESS]], now, sleep: async () => {},
      fetchFn: async () => page([work], broke) });
    expect(res.stoppedForBudget).toBe(true);
    expect(res.done).toEqual([]);
    const again = await runBackfill({ pool, job: JOB, windows, batches: [[NHESS]], now, sleep: async () => {}, fetchFn: async () => page([work]) });
    expect(again.done).toEqual(["2030-03", "2030-02"]);
  });

  test("sums spend across windows", async () => {
    if (!reachable) return;
    const res = await runBackfill({ pool, job: JOB, windows, batches: [[NHESS]], now, sleep: async () => {}, fetchFn: async () => page([work]) });
    expect(res.spendUsd).toBeCloseTo(0.0002, 6);
  });
});
