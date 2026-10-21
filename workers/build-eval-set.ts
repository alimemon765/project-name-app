// CLI: npm run eval:build   One-off: draws the 200-item classifier eval set (lib/eval/plan.ts) into classifier_eval_items.
// Refuses to run if a set already exists (labels hang off it). Rejected works have no papers row, so their title and
// abstract come from free OpenAlex singleton lookups.
import { Pool, type PoolClient } from "pg";
import { BROAD_JOURNALS, EVAL_PLAN, shuffleOrder, type Stratum } from "../src/lib/eval/plan";
import { CLASSIFIER_VERSION } from "../src/lib/ingest/papers";
import { fetchWithRetry, readJson, realSleep } from "../src/lib/ingest/shared";
import { mapWork } from "../src/lib/openalex/map";

const SEED = 20261022;
const OPENALEX_DELAY_MS = 150;

interface Item { stratum: string; sourceKey: string; paperId: string | null; doi: string | null; title: string; abstract: string | null; venue: string; predicted: number[] }

async function drawClassified(c: PoolClient, s: Stratum, n: number, exclude: Set<string>): Promise<Item[]> {
  const where = s.source === "journal"
    ? `not j.is_preprint_server and ${s.journals === "broad" ? "" : "not "}(j.slug = any($2))`
    : `j.is_preprint_server and lower(j.abbreviation) = $2`;
  const arg = s.source === "journal" ? [...BROAD_JOURNALS] : ({ arxiv: "arxiv", essoar: "essoar", eartharxiv: "eartharxiv", ssrn: "ssrn" } as const)[s.server!];
  const r = await c.query(
    `select p.id, coalesce(p.openalex_id, p.doi) as key, p.doi, p.title, p.abstract, j.abbreviation as venue, p.topic_ids
       from papers p join journals j on j.id = p.journal_id
      where ${where} and p.published_version_id is null and p.pub_date >= current_date - 365
      order by md5(p.id::text || $1) limit $3`, [String(SEED), arg, n + exclude.size]);
  return r.rows.filter((x) => !exclude.has(x.key)).slice(0, n)
    .map((x) => ({ stratum: s.name, sourceKey: x.key, paperId: x.id, doi: x.doi, title: x.title, abstract: x.abstract, venue: x.venue, predicted: x.topic_ids }));
}

async function drawRejected(c: PoolClient, s: Stratum, n: number, log: (m: string) => void): Promise<Item[]> {
  const r = await c.query(
    `select l.openalex_id, j.abbreviation as venue from paper_ledger l join journals j on j.id = l.journal_id
      where not l.classified and ${s.journals === "broad" ? "" : "not "}(j.slug = any($2)) and l.pub_date >= current_date - 365
      order by md5(l.openalex_id || $1) limit $3`, [String(SEED), [...BROAD_JOURNALS], n * 2]);
  const out: Item[] = [];
  for (const row of r.rows) {
    if (out.length >= n) break;
    await realSleep(OPENALEX_DELAY_MS);
    const res = await fetchWithRetry(`https://api.openalex.org/works/${row.openalex_id}?select=id,doi,title,publication_date,abstract_inverted_index,authorships,primary_location,open_access,best_oa_location,cited_by_count,counts_by_year,type${process.env.CONTACT_EMAIL ? `&mailto=${encodeURIComponent(process.env.CONTACT_EMAIL)}` : ""}`,
      fetch, realSleep, "OpenAlex");
    const mapped = mapWork(await readJson(res, 2_000_000), "eval", new Date());
    if (!mapped?.title) { log(`skipped ${row.openalex_id}: no title`); continue; }
    out.push({ stratum: s.name, sourceKey: row.openalex_id, paperId: null, doi: mapped.doi, title: mapped.title, abstract: mapped.abstract, venue: row.venue, predicted: [] });
  }
  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const log = (m: string) => process.stderr.write(`${m}\n`);
  const c = await pool.connect();
  try {
    if ((await c.query(`select count(*)::int as n from classifier_eval_items`)).rows[0].n > 0) throw new Error("an eval set already exists; labels depend on it, so it is never redrawn");
    const items: Item[] = [];
    let shortfall = 0;
    for (const s of EVAL_PLAN.filter((x) => x.name !== "journal:core")) {
      const got = s.kind === "classified" ? await drawClassified(c, s, s.count, new Set()) : await drawRejected(c, s, s.count, log);
      if (got.length < s.count) log(`${s.name}: only ${got.length} of ${s.count}; the rest come from journal:core`);
      shortfall += s.count - got.length;
      items.push(...got);
    }
    const core = EVAL_PLAN.find((x) => x.name === "journal:core")!;
    items.push(...(await drawClassified(c, core, core.count + shortfall, new Set(items.map((i) => i.sourceKey)))));
    const order = shuffleOrder(items.length, SEED);
    await c.query("begin");
    for (const [i, it] of items.entries()) {
      await c.query(
        `insert into classifier_eval_items (stratum, source_key, paper_id, doi, title, abstract, venue, predicted_topic_ids, classifier_version, review_order)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [it.stratum, it.sourceKey, it.paperId, it.doi, it.title, it.abstract, it.venue, it.predicted, CLASSIFIER_VERSION, order[i]]);
    }
    await c.query("commit");
    const by = items.reduce<Record<string, number>>((m, i) => ({ ...m, [i.stratum]: (m[i.stratum] ?? 0) + 1 }), {});
    process.stdout.write(`eval set: ${items.length} items ${JSON.stringify(by)}\n`);
  } catch (e) {
    await c.query("rollback").catch(() => {});
    throw e;
  } finally {
    c.release();
    await pool.end();
  }
}

main().catch((e) => { process.stderr.write(`eval:build failed: ${e instanceof Error ? e.message : e}\n`); process.exit(1); });
