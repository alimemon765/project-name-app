// CLI: npm run ingest:papers -- [--days 45] [--journals S1,S2]   (default: all 127 journals, volume-balanced batches)
import { Pool } from "pg";
import { ingestPapers } from "../src/lib/ingest/papers";
import { allJournalBatches } from "./journal-batches";


function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const days = Number(arg("days") ?? 45);
  const from = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const batches = allJournalBatches(arg("journals")?.split(","));
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
  if (!Number.isFinite(days) || days <= 0) throw new Error(`--days must be a positive number, got ${arg("days")}`);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2, connectionTimeoutMillis: 5000 });
  pool.on("error", (e) => process.stderr.write(`[db] ${e.message}\n`));
  try {
    const stats = await ingestPapers({
      pool, batches, fromPublicationDate: from,
      apiKey: process.env.OPENALEX_API_KEY || undefined, mailto: process.env.CONTACT_EMAIL || undefined,
      dailyStopUsd: Number(process.env.OPENALEX_DAILY_STOP_USD || 0.8), log: (m) => process.stderr.write(`${m}\n`),
    });
    process.stdout.write(`ingest done: ${JSON.stringify(stats)}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { process.stderr.write(`ingest failed: ${e instanceof Error ? e.message : e}\n`); process.exit(1); });
