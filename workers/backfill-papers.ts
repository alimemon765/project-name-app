// CLI: npm run backfill:papers -- [--months 24] [--journals S1,S2]
// Resumable: rerun until it reports no incomplete months (keyless OpenAlex allows about $0.10/day).
import { Pool } from "pg";
import { monthWindows } from "../src/lib/ingest/backfill";
import { runBackfill } from "../src/lib/ingest/run-backfill";
import { allJournalBatches } from "./journal-batches";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const months = Number(arg("months") ?? 24);
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
  if (!Number.isInteger(months) || months < 1 || months > 60) throw new Error(`--months must be 1–60, got ${arg("months")}`);
  const batches = allJournalBatches(arg("journals")?.split(","));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 5000 });
  pool.on("error", (e) => process.stderr.write(`[db] ${e.message}\n`));
  const log = (m: string) => process.stderr.write(`${m}\n`);
  try {
    log(`backfill: ${months} months × ${batches.length} batches (${batches.flat().length} journals)`);
    const res = await runBackfill({
      pool, windows: monthWindows(new Date(), months), batches,
      apiKey: process.env.OPENALEX_API_KEY || undefined, mailto: process.env.CONTACT_EMAIL || undefined,
      log,
    });
    process.stdout.write(`backfill: ${JSON.stringify(res)}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { process.stderr.write(`backfill failed: ${e instanceof Error ? e.message : e}\n`); process.exit(1); });
