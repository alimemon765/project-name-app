// CLI: npm run ingest:preprints -- [--days 14] [--months 24] [--servers arxiv,essoar,eartharxiv,ssrn]
// --days: the scheduled run (re-lists a short window; the ledger dedupes). --months: backfill.
// arXiv and EarthArXiv page newest-first, so one pass covers any range; Crossref servers run month by month.
import { Pool } from "pg";
import { monthWindows } from "../src/lib/ingest/backfill";
import { ingestPreprints, type PreprintStats } from "../src/lib/ingest/preprints";
import type { PreprintServer } from "../src/lib/preprints/types";

const ALL: PreprintServer[] = ["arxiv", "essoar", "eartharxiv", "ssrn"];
const SINGLE_PASS: PreprintServer[] = ["arxiv", "eartharxiv"];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function parseServers(raw: string | undefined): PreprintServer[] {
  const list = (raw?.split(",") ?? ALL).map((s) => s.trim());
  const bad = list.filter((s) => !ALL.includes(s as PreprintServer));
  if (bad.length) throw new Error(`unknown server(s): ${bad.join(", ")} (use ${ALL.join(",")})`);
  return list as PreprintServer[];
}

const isoDaysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
  const servers = parseServers(arg("servers"));
  const months = arg("months") ? Number(arg("months")) : null;
  const days = Number(arg("days") ?? 14);
  if (months !== null && (!Number.isInteger(months) || months < 1 || months > 60)) throw new Error(`--months must be 1–60, got ${arg("months")}`);
  if (!Number.isFinite(days) || days <= 0) throw new Error(`--days must be a positive number, got ${arg("days")}`);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 5000 });
  pool.on("error", (e) => process.stderr.write(`[db] ${e.message}\n`));
  const log = (m: string) => process.stderr.write(`${m}\n`);
  const common = { pool, mailto: process.env.CONTACT_EMAIL || undefined, log };
  const totals: Record<string, { fetched: number; classified: number; errors: string[] }> = {};
  const add = (s: PreprintStats) => {
    for (const [k, v] of Object.entries(s)) {
      const t = (totals[k] ??= { fetched: 0, classified: 0, errors: [] });
      t.fetched += v.fetched;
      t.classified += v.classified;
      if (v.error) t.errors.push(v.error);
    }
  };
  try {
    if (months === null) {
      add(await ingestPreprints({ ...common, servers, fromDate: isoDaysAgo(days) }));
    } else {
      const windows = monthWindows(new Date(), months);
      const single = servers.filter((s) => SINGLE_PASS.includes(s));
      const monthly = servers.filter((s) => !SINGLE_PASS.includes(s));
      if (single.length) add(await ingestPreprints({ ...common, servers: single, fromDate: windows.at(-1)!.from }));
      for (const w of monthly.length ? windows : []) {
        log(`preprints ${w.key} (${monthly.join(", ")})`);
        add(await ingestPreprints({ ...common, servers: monthly, fromDate: w.from, toDate: w.to }));
      }
    }
    process.stdout.write(`preprints done: ${JSON.stringify(totals)}\n`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { process.stderr.write(`preprints failed: ${e instanceof Error ? e.message : e}\n`); process.exit(1); });
