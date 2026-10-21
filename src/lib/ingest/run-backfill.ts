// Resumable backfill: one ingest run per month window, newest first. A window counts as done only when its run
// succeeded without hitting the budget stop or the keyless page cap, so a rerun picks up exactly what is missing.
import type { Pool } from "pg";
import { ingestPapers, type IngestOptions, type IngestStats } from "./papers";
import type { MonthWindow } from "./backfill";

export const BACKFILL_JOB = "backfill_papers";

export interface BackfillOptions extends Omit<IngestOptions, "fromPublicationDate" | "toPublicationDate" | "runKey" | "journalOpenalexIds"> {
  pool: Pool;
  job?: string;                      // default BACKFILL_JOB; tests use their own so they never wait on a live run's lock
  windows: MonthWindow[];
  batches: string[][];
}

export interface BackfillResult {
  done: string[]; skipped: string[]; incomplete: string[];
  stoppedForBudget: boolean; spendUsd: number; fetched: number; classified: number;
}

async function completedKeys(pool: Pool, job: string, keys: string[]): Promise<Set<string>> {
  const r = await pool.query(
    `select run_key from job_runs where job = $1 and run_key = any($2) and status = 'succeeded'
       and coalesce((meta->>'stoppedForBudget')::boolean, false) = false and coalesce((meta->>'truncated')::boolean, false) = false`,
    [job, keys]);
  return new Set(r.rows.map((x) => String(x.run_key)));
}

export async function runBackfill(opts: BackfillOptions): Promise<BackfillResult> {
  const { windows, job = BACKFILL_JOB, ...ingest } = opts;
  const runKey = (w: MonthWindow) => `${job}:${w.key}`;
  const finished = await completedKeys(opts.pool, job, windows.map(runKey));
  const result: BackfillResult = { done: [], skipped: [], incomplete: [], stoppedForBudget: false, spendUsd: 0, fetched: 0, classified: 0 };
  for (const w of windows) {
    if (finished.has(runKey(w))) { result.skipped.push(w.key); continue; }
    const stats: IngestStats = await ingestPapers({ ...ingest, fromPublicationDate: w.from, toPublicationDate: w.to, job, runKey: runKey(w) });
    result.spendUsd += stats.spendUsd;
    result.fetched += stats.fetched;
    result.classified += stats.classified;
    if (stats.stoppedForBudget) { result.stoppedForBudget = true; result.incomplete.push(w.key); break; }
    (stats.truncated ? result.incomplete : result.done).push(w.key);
    opts.log?.(`backfill ${w.key}: fetched ${stats.fetched}, classified ${stats.classified}, $${stats.spendUsd.toFixed(4)}${stats.truncated ? " (truncated)" : ""}`);
  }
  return result;
}
