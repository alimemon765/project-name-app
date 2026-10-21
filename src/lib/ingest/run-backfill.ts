// Resumable backfill: one ingest run per month window, newest first. A window counts as done only when its run
// succeeded without hitting the budget stop or the keyless page cap, so a rerun picks up exactly what is missing.
import type { Pool } from "pg";
import { ingestPapers, type IngestOptions, type IngestStats } from "./papers";
import type { MonthWindow } from "./backfill";

export const BACKFILL_JOB = "backfill_papers";

export interface BackfillOptions extends Omit<IngestOptions, "fromPublicationDate" | "toPublicationDate" | "job" | "runKey" | "journalOpenalexIds"> {
  pool: Pool;
  windows: MonthWindow[];
  batches: string[][];
}

export interface BackfillResult {
  done: string[]; skipped: string[]; incomplete: string[];
  stoppedForBudget: boolean; spendUsd: number; fetched: number; classified: number;
}

async function completedKeys(pool: Pool, keys: string[]): Promise<Set<string>> {
  const r = await pool.query(
    `select run_key from job_runs where job = $1 and run_key = any($2) and status = 'succeeded'
       and coalesce((meta->>'stoppedForBudget')::boolean, false) = false and coalesce((meta->>'truncated')::boolean, false) = false`,
    [BACKFILL_JOB, keys]);
  return new Set(r.rows.map((x) => String(x.run_key)));
}

export async function runBackfill(opts: BackfillOptions): Promise<BackfillResult> {
  const { windows, ...ingest } = opts;
  const runKey = (w: MonthWindow) => `${BACKFILL_JOB}:${w.key}`;
  const finished = await completedKeys(opts.pool, windows.map(runKey));
  const result: BackfillResult = { done: [], skipped: [], incomplete: [], stoppedForBudget: false, spendUsd: 0, fetched: 0, classified: 0 };
  for (const w of windows) {
    if (finished.has(runKey(w))) { result.skipped.push(w.key); continue; }
    const stats: IngestStats = await ingestPapers({ ...ingest, fromPublicationDate: w.from, toPublicationDate: w.to, job: BACKFILL_JOB, runKey: runKey(w) });
    result.spendUsd += stats.spendUsd;
    result.fetched += stats.fetched;
    result.classified += stats.classified;
    if (stats.stoppedForBudget) { result.stoppedForBudget = true; result.incomplete.push(w.key); break; }
    (stats.truncated ? result.incomplete : result.done).push(w.key);
    opts.log?.(`backfill ${w.key}: fetched ${stats.fetched}, classified ${stats.classified}, $${stats.spendUsd.toFixed(4)}${stats.truncated ? " (truncated)" : ""}`);
  }
  return result;
}
