// Preprint ingest: every record goes to preprint_ledger; only records that pass the strict gate become papers rows.
// One server failing never stops the others. Logged to job_runs as 'ingest_preprints'.
import type { Pool, PoolClient } from "pg";
import { formatAuthors } from "@/lib/format";
import { tagRegions, type GazetteerRegion } from "@/lib/regions/gazetteer";
import type { KeywordRule } from "@/lib/classify/keywords";
import { passesStrictGate } from "@/lib/preprints/gate";
import { SOURCES } from "@/lib/preprints/sources";
import type { PreprintRecord, PreprintServer } from "@/lib/preprints/types";
import { loadRules, realSleep, type Sleep } from "./shared";
import { CLASSIFIER_VERSION } from "./papers";

const JOB = "ingest_preprints";
const ABBREVIATION: Record<PreprintServer, string> = { arxiv: "arXiv", essoar: "ESSOAr", eartharxiv: "EarthArXiv", ssrn: "SSRN" };
const ABSTRACT_SOURCE: Record<PreprintServer, string> = { arxiv: "arxiv", essoar: "crossref", eartharxiv: "oai", ssrn: "crossref" };

export interface PreprintOptions {
  pool: Pool; servers: readonly PreprintServer[]; fromDate: string; toDate?: string;
  now?: Date; fetchFn?: typeof fetch; sleep?: Sleep; mailto?: string; log?: (m: string) => void;
}
export interface ServerStats { fetched: number; classified: number; failed: number; error?: string }
export type PreprintStats = Partial<Record<PreprintServer, ServerStats>> & Record<string, ServerStats>;

async function storePreprint(c: PoolClient, r: PreprintRecord, journalId: string, rules: KeywordRule[], regions: GazetteerRegion[]): Promise<boolean> {
  const topics = passesStrictGate({ title: r.title, abstract: r.abstract }, rules);
  const classified = topics.topicIds.length > 0 && r.doi !== null;
  await c.query("begin");
  await c.query(
    `insert into preprint_ledger (server, source_id, doi, journal_id, pub_date, classified, classifier_version) values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (server, source_id) do update set doi = excluded.doi, classified = excluded.classified, classifier_version = excluded.classifier_version`,
    [r.server, r.sourceId, r.doi, journalId, r.pubDate, classified, CLASSIFIER_VERSION]);
  if (classified) {
    await c.query(
      `insert into papers (doi, arxiv_id, title, abstract, abstract_source, authors_display, author_count, journal_id, pub_date,
         is_oa, oa_url, licence, topic_ids, topic_scores, region_ids, is_preprint, classifier_version)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, true, $16)
       on conflict (doi) do update set title = excluded.title, abstract = coalesce(excluded.abstract, papers.abstract),
         authors_display = excluded.authors_display, author_count = excluded.author_count, is_oa = excluded.is_oa, oa_url = excluded.oa_url,
         licence = coalesce(excluded.licence, papers.licence), topic_ids = excluded.topic_ids, topic_scores = excluded.topic_scores,
         region_ids = excluded.region_ids, classifier_version = excluded.classifier_version`,
      [r.doi, r.arxivId, r.title, r.abstract, r.abstract ? ABSTRACT_SOURCE[r.server] : null, formatAuthors(r.authors), r.authors.length,
       journalId, r.pubDate, r.isOa, r.url, r.licence, topics.topicIds, JSON.stringify(topics.scores),
       tagRegions(`${r.title} ${r.abstract ?? ""}`, regions), CLASSIFIER_VERSION]);
    if (r.publishedDoi) {
      await c.query(
        `update papers set published_version_id = pub.id from papers pub
          where papers.doi = $1 and pub.doi = $2 and not pub.is_preprint`, [r.doi, r.publishedDoi]);
    }
  }
  await c.query("commit");
  return classified;
}

const NORM_TITLE = (col: string) => `lower(regexp_replace(${col}, '[^[:alnum:]]+', '', 'g'))`;
const MIN_TITLE_FOR_MATCH = 30;     // short titles ("Editorial", "Reply") collide across papers

/** Link unlinked preprints to a journal paper with the same normalised title. Returns how many were linked. */
export async function linkPublishedVersions(pool: Pool): Promise<number> {
  const r = await pool.query(
    `update papers pre set published_version_id = pub.id
       from papers pub
      where pre.is_preprint and pre.published_version_id is null and not pub.is_preprint
        and length(pre.title) >= $1 and ${NORM_TITLE("pub.title")} = ${NORM_TITLE("pre.title")}`, [MIN_TITLE_FOR_MATCH]);
  return r.rowCount ?? 0;
}

export async function ingestPreprints(opts: PreprintOptions): Promise<PreprintStats> {
  const { pool, now = new Date(), fetchFn = fetch, sleep = realSleep, log = () => {} } = opts;
  const stats: PreprintStats = {};
  const c = await pool.connect();
  const runKey = `${JOB}:${now.toISOString().slice(0, 13)}`;
  let runId: string | null = null;
  let locked = false;
  try {
    locked = (await c.query(`select pg_try_advisory_lock(hashtext($1)) as ok`, [JOB])).rows[0].ok;
    const run = await c.query(
      `insert into job_runs (job, run_key, status, attempt)
       values ($2, $1, 'running', coalesce((select max(attempt) from job_runs where job = $2 and run_key = $1), 0) + 1) returning id`, [runKey, JOB]);
    runId = run.rows[0].id;
    if (!locked) {
      await c.query(`update job_runs set status = 'skipped', finished_at = now(), error = 'another run holds the lock' where id = $1`, [runId]);
      return stats;
    }
    const { rules, regions } = await loadRules(c);
    const servers = await c.query(`select id, abbreviation from journals where is_preprint_server`);
    const journalByAbbr = new Map<string, string>(servers.rows.map((s) => [s.abbreviation, s.id]));
    const journalIdFor = (s: PreprintServer) => {
      const id = journalByAbbr.get(ABBREVIATION[s]);
      if (!id) throw new Error(`no journals row for preprint server ${s} (run migration 0002)`);
      return id;
    };
    for (const server of opts.servers) {
      const s: ServerStats = { fetched: 0, classified: 0, failed: 0 };
      stats[server] = s;
      const seen = new Set<string>();
      try {
        const ctx = { fromDate: opts.fromDate, toDate: opts.toDate, fetchFn, sleep, mailto: opts.mailto };
        for await (const page of SOURCES[server](ctx)) {
          for (const rec of page) {
            if (seen.has(rec.sourceId)) continue;
            seen.add(rec.sourceId);
            s.fetched++;
            try {
              if (await storePreprint(c, rec, journalIdFor(server), rules, regions)) s.classified++;
            } catch (e) {
              await c.query("rollback").catch(() => {});
              s.failed++;
              log(`skipped ${server}:${rec.sourceId}: ${e instanceof Error ? e.message : String(e)}`);
            }
          }
        }
      } catch (e) {
        s.error = e instanceof Error ? e.message : String(e);       // this server failed; carry on with the next
        log(`${server} failed: ${s.error}`);
      }
      log(`${server}: fetched ${s.fetched}, classified ${s.classified}${s.error ? `, error ${s.error}` : ""}`);
    }
    const linked = await linkPublishedVersions(pool);
    const anyFailed = Object.values(stats).some((s) => s.error);
    await c.query(`update job_runs set status = $2, finished_at = now(), items_in = $3, items_out = $4, error = $5, meta = $6 where id = $1`,
      [runId, anyFailed ? "failed" : "succeeded",
       Object.values(stats).reduce((n, s) => n + s.fetched, 0), Object.values(stats).reduce((n, s) => n + s.classified, 0),
       anyFailed ? Object.entries(stats).filter(([, s]) => s.error).map(([k, s]) => `${k}: ${s.error}`).join("; ") : null,
       JSON.stringify({ ...stats, linked })]);
    return stats;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    if (runId) await c.query(`update job_runs set status = 'failed', finished_at = now(), error = $2 where id = $1`, [runId, e instanceof Error ? e.message : String(e)]).catch(() => {});
    throw e;
  } finally {
    if (locked) await c.query(`select pg_advisory_unlock(hashtext($1))`, [JOB]).catch(() => {});
    c.release();
  }
}
