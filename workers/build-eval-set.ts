// CLI: npm run eval:build [-- --from-fixture]
// Draws the 200-item classifier eval set (lib/eval/plan.ts v2, D043) into classifier_eval_items and records it in
// replica/eval/eval-set.json (seed, method, every item's source key and stratum). --from-fixture rebuilds that exact set.
// Refuses to run while items exist (labels hang off them). Rejected works have no papers row: their text comes from
// free OpenAlex singleton lookups.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { Pool, type PoolClient } from "pg";
import { BROAD_JOURNALS, CORE_PER_JOURNAL_MAX, EVAL_PLAN, NEAR_MISS_PER_TRAP_MAX, NEAR_MISS_TRAPS, PLAN_VERSION, shuffleOrder, type Stratum } from "../src/lib/eval/plan";
import { CLASSIFIER_VERSION } from "../src/lib/ingest/papers";
import { fetchWithRetry, readJson, realSleep } from "../src/lib/ingest/shared";
import { mapWork } from "../src/lib/openalex/map";

const SEED = 20261023;
const FIXTURE = new URL("../replica/eval/eval-set.json", import.meta.url);
const OPENALEX_DELAY_MS = 150;
const TOPICS = 13;

interface Item {
  stratum: string; sourceKey: string; paperId: string | null; doi: string | null; title: string; abstract: string | null;
  venue: string; predicted: number[]; pubDate: string | null; nearMissTerm: string | null;
}

const PAPER_COLS = `p.id, coalesce(p.openalex_id, p.doi) as key, p.doi, p.title, p.abstract, j.abbreviation as venue, j.slug, p.topic_ids,
  to_char(p.pub_date, 'YYYY-MM-DD') as pub_date`;
const toItem = (stratum: string, r: Record<string, unknown>, term: string | null = null): Item => ({
  stratum, sourceKey: String(r.key), paperId: String(r.id), doi: (r.doi as string) ?? null, title: String(r.title), abstract: (r.abstract as string) ?? null,
  venue: String(r.venue), predicted: (r.topic_ids as number[]) ?? [], pubDate: (r.pub_date as string) ?? null, nearMissTerm: term,
});

async function papers(c: PoolClient, where: string, args: unknown[], limit: number, taken: Set<string>): Promise<Record<string, unknown>[]> {
  const r = await c.query(
    `select ${PAPER_COLS} from papers p join journals j on j.id = p.journal_id
      where p.published_version_id is null and ${where} order by md5(p.id::text || '${SEED}') limit ${limit + taken.size}`, args);
  return r.rows.filter((x) => !taken.has(String(x.key)));
}

async function openAlexText(id: string): Promise<{ doi: string | null; title: string; abstract: string | null; pubDate: string | null } | null> {
  await realSleep(OPENALEX_DELAY_MS);
  const mail = process.env.CONTACT_EMAIL ? `&mailto=${encodeURIComponent(process.env.CONTACT_EMAIL)}` : "";
  const key = process.env.OPENALEX_API_KEY ? `&api_key=${encodeURIComponent(process.env.OPENALEX_API_KEY)}` : "";
  const res = await fetchWithRetry(`https://api.openalex.org/works/${id}?select=id,doi,title,publication_date,abstract_inverted_index,authorships,primary_location,open_access,best_oa_location,cited_by_count,counts_by_year,type${mail}${key}`,
    fetch, realSleep, "OpenAlex");
  const w = mapWork(await readJson(res, 2_000_000), "eval", new Date());
  return w?.title ? { doi: w.doi, title: w.title, abstract: w.abstract, pubDate: w.pubDate } : null;
}

async function rejected(c: PoolClient, s: Stratum, taken: Set<string>, log: (m: string) => void): Promise<Item[]> {
  const r = await c.query(
    `select l.openalex_id as key, j.abbreviation as venue from paper_ledger l join journals j on j.id = l.journal_id
      where not l.classified and ${s.journals === "broad" ? "" : "not "}(j.slug = any($1))
      order by md5(l.openalex_id || '${SEED}') limit ${s.count * 2}`, [[...BROAD_JOURNALS]]);
  const out: Item[] = [];
  for (const row of r.rows) {
    if (out.length >= s.count || taken.has(row.key)) continue;
    const t = await openAlexText(row.key);
    if (!t) { log(`skipped ${row.key}: no title`); continue; }
    out.push({ stratum: s.name, sourceKey: row.key, paperId: null, doi: t.doi, title: t.title, abstract: t.abstract, venue: row.venue, predicted: [], pubDate: t.pubDate, nearMissTerm: null });
  }
  return out;
}

async function draw(c: PoolClient, log: (m: string) => void): Promise<Item[]> {
  const items: Item[] = [];
  const taken = new Set<string>();
  const add = (xs: Item[]) => { for (const x of xs) { items.push(x); taken.add(x.sourceKey); } };
  const broad = [...BROAD_JOURNALS];
  for (const s of EVAL_PLAN) {
    if (s.kind === "rejected") { add(await rejected(c, s, taken, log)); continue; }
    if (s.kind === "near_miss") {
      // Spread across the traps (at most NEAR_MISS_PER_TRAP_MAX each), then top up from whichever traps have more.
      const perTrap = Math.ceil(s.count / NEAR_MISS_TRAPS.length);
      for (const pass of [perTrap, NEAR_MISS_PER_TRAP_MAX]) {
        for (const t of NEAR_MISS_TRAPS) {
          const have = items.filter((i) => i.nearMissTerm === t.name).length;
          const want = Math.min(pass - have, s.count - items.filter((i) => i.stratum === s.name).length);
          if (want <= 0) continue;
          const rows = await papers(c, `not p.is_preprint and (p.title ~* $1 or coalesce(p.abstract, '') ~* $1)`, [t.pattern], want, taken);
          add(rows.slice(0, want).map((r) => toItem(s.name, r, t.name)));
        }
      }
      continue;
    }
    if (s.source === "preprint") {
      add((await papers(c, `j.is_preprint_server and lower(j.abbreviation) = $1`, [s.server], s.count, taken)).slice(0, s.count).map((r) => toItem(s.name, r)));
      continue;
    }
    if (s.journals === "broad") {
      add((await papers(c, `j.slug = any($1)`, [broad], s.count, taken)).slice(0, s.count).map((r) => toItem(s.name, r)));
      continue;
    }
    // Core journals, stratified by primary topic (the highest-scoring one), at most CORE_PER_JOURNAL_MAX per journal.
    const perJournal = new Map<string, number>();
    const pick = (rows: Record<string, unknown>[], n: number) => {
      const out: Item[] = [];
      for (const r of rows) {
        if (out.length >= n) break;
        const j = String(r.slug);
        if ((perJournal.get(j) ?? 0) >= CORE_PER_JOURNAL_MAX || taken.has(String(r.key))) continue;
        perJournal.set(j, (perJournal.get(j) ?? 0) + 1);
        out.push(toItem(s.name, r));
      }
      add(out);
    };
    const perTopic = Math.floor(s.count / TOPICS);
    for (let t = 1; t <= TOPICS; t++) {
      pick(await papers(c, `not j.is_preprint_server and not (j.slug = any($1)) and p.topic_ids[1] = $2`, [broad, t], perTopic * 20, taken), perTopic);
    }
    const missing = s.count - items.filter((i) => i.stratum === s.name).length;
    pick(await papers(c, `not j.is_preprint_server and not (j.slug = any($1))`, [broad], missing * 30, taken), missing);
  }
  return items;
}

async function fromFixture(c: PoolClient, log: (m: string) => void): Promise<Item[]> {
  const fx = JSON.parse(readFileSync(FIXTURE, "utf8")) as { items: { source_key: string; stratum: string; near_miss_term: string | null; predicted?: number[] }[] };
  const out: Item[] = [];
  for (const f of fx.items) {
    const r = await c.query(`select ${PAPER_COLS} from papers p join journals j on j.id = p.journal_id where p.openalex_id = $1 or p.doi = $1 limit 1`, [f.source_key]);
    // The classifier's prediction is restored from the fixture, not re-read from today's papers row.
    if (r.rows[0]) { out.push({ ...toItem(f.stratum, r.rows[0], f.near_miss_term), predicted: f.predicted ?? r.rows[0].topic_ids }); continue; }
    const v = await c.query(`select j.abbreviation as venue from paper_ledger l join journals j on j.id = l.journal_id where l.openalex_id = $1`, [f.source_key]);
    const t = await openAlexText(f.source_key);
    if (!t) { log(`fixture item ${f.source_key} could not be rebuilt`); continue; }
    out.push({ stratum: f.stratum, sourceKey: f.source_key, paperId: null, doi: t.doi, title: t.title, abstract: t.abstract, venue: v.rows[0]?.venue ?? "?", predicted: f.predicted ?? [], pubDate: t.pubDate, nearMissTerm: f.near_miss_term });
  }
  if (out.length !== fx.items.length) throw new Error(`fixture rebuild produced ${out.length} of ${fx.items.length} items; refusing a different set`);
  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (see .env.example)");
  const replay = process.argv.includes("--from-fixture");
  if (replay && !existsSync(FIXTURE)) throw new Error(`--from-fixture: ${FIXTURE.pathname} does not exist`);
  if (!replay && existsSync(FIXTURE) && !process.argv.includes("--force")) {
    throw new Error("replica/eval/eval-set.json already defines the eval set: rebuild it with --from-fixture, or pass --force to draw a new one");
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const log = (m: string) => process.stderr.write(`${m}\n`);
  const c = await pool.connect();
  try {
    if ((await c.query(`select count(*)::int as n from classifier_eval_items`)).rows[0].n > 0) throw new Error("an eval set already exists; labels depend on it, so it is never redrawn");
    const items = replay ? await fromFixture(c, log) : await draw(c, log);
    const order = shuffleOrder(items.length, SEED);
    await c.query("begin");
    for (const [i, it] of items.entries()) {
      await c.query(
        `insert into classifier_eval_items (stratum, source_key, paper_id, doi, title, abstract, venue, predicted_topic_ids, classifier_version, review_order, near_miss_term, pub_date)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [it.stratum, it.sourceKey, it.paperId, it.doi, it.title, it.abstract, it.venue, it.predicted, CLASSIFIER_VERSION, order[i], it.nearMissTerm, it.pubDate]);
    }
    await c.query("commit");
    if (!replay) {
      mkdirSync(new URL("../replica/eval/", import.meta.url), { recursive: true });
      writeFileSync(FIXTURE, JSON.stringify({
        plan_version: PLAN_VERSION, seed: SEED, classifier_version: CLASSIFIER_VERSION, drawn_at: new Date().toISOString(),
        method: "lib/eval/plan.ts EVAL_PLAN v2: seeded md5 order per stratum; core journals stratified by primary topic (topic_ids[1]) with at most 3 per journal; near-misses by keyword-trap regex, at most 4 per trap; rejected works from paper_ledger with text from OpenAlex. Rebuild with: npm run eval:build -- --from-fixture",
        items: items.map((i) => ({ source_key: i.sourceKey, stratum: i.stratum, near_miss_term: i.nearMissTerm, predicted: i.predicted, doi: i.doi, venue: i.venue, pub_date: i.pubDate, title: i.title })),
      }, null, 2) + "\n");
    }
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
