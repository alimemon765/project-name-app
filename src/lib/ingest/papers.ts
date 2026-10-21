// Paper ingest: OpenAlex list pages per journal batch -> ledger (every work) -> classify -> papers (classified only).
// Idempotent (upserts on openalex_id), logs to job_runs, retries with backoff, stops at the daily spend cap.
import type { Pool, PoolClient } from "pg";
import { buildWorksUrl, parseSpend, shouldStopForBudget } from "@/lib/openalex/client";
import { mapWork, type PaperRow } from "@/lib/openalex/map";
import { classify, type KeywordRule } from "@/lib/classify/keywords";
import { tagRegions, type GazetteerRegion } from "@/lib/regions/gazetteer";
import { fetchWithRetry, loadRules, readJson } from "./shared";

export const CLASSIFIER_VERSION = 1;
const SOURCES_PER_BATCH = 50;
const PER_PAGE = 100;
const MAX_KEYLESS_PAGES = 100;
const MAX_CURSOR_PAGES = 2000;                 // 200k works per batch and window: far above any real month
const MAX_PAGE_BYTES = 25 * 1024 * 1024;

export interface IngestOptions {
  pool: Pool;
  journalOpenalexIds?: string[];     // split into batches of 50 ...
  batches?: string[][];              // ... or pre-planned (volume-balanced, see planBatches)
  fromPublicationDate: string;       // YYYY-MM-DD: re-list the window each run; the ledger dedupes
  toPublicationDate?: string;        // YYYY-MM-DD, inclusive (backfill month windows)
  job?: string;                      // job_runs.job and lock name (default 'ingest_papers')
  runKey?: string;                   // default '<job>:<UTC hour>'
  maxKeylessPages?: number;
  now?: Date;
  fetchFn?: typeof fetch;
  apiKey?: string;
  mailto?: string;
  dailyStopUsd?: number;
  sleep?: (ms: number) => Promise<void>;
  log?: (msg: string) => void;
}

export interface IngestStats {
  fetched: number; classified: number; duplicates: number; failed: number; pages: number; spendUsd: number;
  stoppedForBudget: boolean;
  truncated: boolean;                // keyless page cap reached: the window has more works than were listed
}

async function upsertPaper(c: PoolClient, row: PaperRow, topics: { topicIds: number[]; scores: Record<number, number> }, regionIds: number[]): Promise<void> {
  await c.query(
    `insert into papers (openalex_id, doi, title, abstract, abstract_source, authors_display, author_count, journal_id, pub_date,
       is_oa, oa_url, licence, cited_by_count, citations_by_year, trending_score, citations_refreshed_at, topic_ids, topic_scores,
       region_ids, is_preprint, classifier_version)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now(), $16,$17,$18,$19,$20)
     on conflict (openalex_id) do update set
       doi = coalesce(excluded.doi, papers.doi), title = excluded.title, abstract = coalesce(excluded.abstract, papers.abstract),
       abstract_source = coalesce(excluded.abstract_source, papers.abstract_source), authors_display = excluded.authors_display,
       author_count = excluded.author_count, is_oa = excluded.is_oa, oa_url = excluded.oa_url, licence = excluded.licence,
       cited_by_count = excluded.cited_by_count, citations_by_year = excluded.citations_by_year, trending_score = excluded.trending_score,
       citations_refreshed_at = now(), topic_ids = excluded.topic_ids, topic_scores = excluded.topic_scores, region_ids = excluded.region_ids,
       classifier_version = excluded.classifier_version`,
    [row.openalexId, row.doi, row.title, row.abstract, row.abstract ? "openalex" : null, row.authorsDisplay, row.authorCount, row.journalId,
     row.pubDate, row.isOa, row.oaUrl, row.licence, row.citedByCount, JSON.stringify(row.citationsByYear), row.trendingScore,
     topics.topicIds, JSON.stringify(topics.scores), regionIds, row.isPreprint, CLASSIFIER_VERSION],
  );
}

async function storeWork(c: PoolClient, row: PaperRow, rules: KeywordRule[], regions: GazetteerRegion[], stats: IngestStats): Promise<void> {
  const topics = classify({ title: row.title, abstract: row.abstract }, rules);
  await c.query("begin");
  // OpenAlex sometimes has two work ids for one DOI (duplicate records): the first owner keeps the paper row.
  const owner = row.doi ? await c.query(`select openalex_id from papers where doi = $1 and openalex_id <> $2`, [row.doi, row.openalexId]) : null;
  const duplicate = Boolean(owner?.rowCount);
  const classified = topics.topicIds.length > 0 && !duplicate;
  await c.query(
    `insert into paper_ledger (openalex_id, doi, journal_id, pub_date, classified, classifier_version) values ($1,$2,$3,$4,$5,$6)
     on conflict (openalex_id) do update set classified = excluded.classified, classifier_version = excluded.classifier_version`,
    [row.openalexId, row.doi, row.journalId, row.pubDate, classified, CLASSIFIER_VERSION]);
  if (duplicate) stats.duplicates++;
  else if (classified) {
    await upsertPaper(c, row, topics, tagRegions(`${row.title} ${row.abstract ?? ""}`, regions));
    stats.classified++;
  }
  await c.query("commit");
}

function chunk<T>(xs: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(xs.length / size) }, (_, i) => xs.slice(i * size, (i + 1) * size));
}

export async function ingestPapers(opts: IngestOptions): Promise<IngestStats> {
  const { pool, now = new Date(), fetchFn = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), log = () => {} } = opts;
  const stats: IngestStats = { fetched: 0, classified: 0, duplicates: 0, failed: 0, pages: 0, spendUsd: 0, stoppedForBudget: false, truncated: false };
  const job = opts.job ?? "ingest_papers";
  const runKey = opts.runKey ?? `${job}:${now.toISOString().slice(0, 13)}`;
  const maxKeylessPages = opts.maxKeylessPages ?? MAX_KEYLESS_PAGES;
  const c = await pool.connect();
  let runId: string | null = null;
  let locked = false;
  try {
    locked = (await c.query(`select pg_try_advisory_lock(hashtext($1)) as ok`, [job])).rows[0].ok;
    // Same-hour reruns are new attempts of the same run key (unique (job, run_key, attempt)).
    const run = await c.query(
      `insert into job_runs (job, run_key, status, attempt)
       values ($2, $1, 'running', coalesce((select max(attempt) from job_runs where job = $2 and run_key = $1), 0) + 1)
       returning id`, [runKey, job]);
    runId = run.rows[0].id;
    if (!locked) {
      await c.query(`update job_runs set status = 'skipped', finished_at = now(), error = 'another run holds the lock' where id = $1`, [runId]);
      return stats;
    }
    const { rules, regions } = await loadRules(c);
    const requested = opts.batches?.flat() ?? opts.journalOpenalexIds ?? [];
    const journals = await c.query(`select id, openalex_id from journals where openalex_id = any($1) and enabled`, [requested]);
    const journalBySource = new Map<string, string>(journals.rows.map((j) => [j.openalex_id, j.id]));
    const batches = (opts.batches ?? chunk([...journalBySource.keys()], SOURCES_PER_BATCH))
      .map((b) => b.filter((id) => journalBySource.has(id))).filter((b) => b.length > 0);
    for (const batch of batches) {
      if (stats.stoppedForBudget) break;
      // With a key: cursor paging (unbounded). Keyless: page numbers (OpenAlex caps basic paging at 10,000 results).
      const useCursor = Boolean(opts.apiKey);
      let cursor: string | undefined = "*";
      let page = 1;
      while (useCursor ? cursor : page <= maxKeylessPages) {
        const url = buildWorksUrl({ sourceIds: batch, fromPublicationDate: opts.fromPublicationDate, toPublicationDate: opts.toPublicationDate,
          ...(useCursor ? { cursor } : { page }), apiKey: opts.apiKey, mailto: opts.mailto });
        const res = await fetchWithRetry(url, fetchFn, sleep, "OpenAlex");
        const spend = parseSpend(res.headers);
        stats.spendUsd += spend.costUsd ?? 0;
        stats.pages++;
        const body = (await readJson(res, MAX_PAGE_BYTES)) as { results?: unknown[]; meta?: { next_cursor?: string | null } };
        for (const work of body.results ?? []) {
          const sourceId = String((work as { primary_location?: { source?: { id?: string } } })?.primary_location?.source?.id ?? "").replace("https://openalex.org/", "");
          const journalId = journalBySource.get(sourceId);
          const row = journalId ? mapWork(work, journalId, now) : null;
          if (!row || !row.openalexId || !row.pubDate) continue;
          stats.fetched++;
          try {
            await storeWork(c, row, rules, regions, stats);
          } catch (e) {
            await c.query("rollback").catch(() => {});
            stats.failed++;                                   // one bad record never stalls the run
            log(`skipped ${row.openalexId}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
        const nextCursor = body.meta?.next_cursor ?? undefined;
        // A cursor that repeats, or a page with no results, ends the batch: never spin on a broken upstream.
        cursor = nextCursor && nextCursor !== cursor && (body.results?.length ?? 0) > 0 ? nextCursor : undefined;
        page++;
        if (opts.dailyStopUsd !== undefined && shouldStopForBudget(spend, opts.dailyStopUsd)) {
          stats.stoppedForBudget = true;
          log(`stopping: daily OpenAlex budget below cap (remaining $${spend.remainingUsd})`);
          break;
        }
        if (!useCursor && (body.results?.length ?? 0) < PER_PAGE) break;
        if (useCursor && cursor && page > MAX_CURSOR_PAGES) {
          stats.truncated = true;
          log(`truncated: ${batch.join("|")} passed ${MAX_CURSOR_PAGES} cursor pages in this window`);
          break;
        }
        if (!useCursor && page > maxKeylessPages) {
          stats.truncated = true;
          log(`truncated: ${batch.join("|")} has more than ${maxKeylessPages * PER_PAGE} works in this window`);
        }
      }
    }
    await c.query(`update job_runs set status = 'succeeded', finished_at = now(), items_in = $2, items_out = $3, spend_usd = $4, meta = $5 where id = $1`,
      [runId, stats.fetched, stats.classified, stats.spendUsd, JSON.stringify({ pages: stats.pages, stoppedForBudget: stats.stoppedForBudget, truncated: stats.truncated })]);
    return stats;
  } catch (e) {
    await c.query("rollback").catch(() => {});
    if (runId) await c.query(`update job_runs set status = 'failed', finished_at = now(), error = $2 where id = $1`, [runId, e instanceof Error ? e.message : String(e)]).catch(() => {});
    throw e;
  } finally {
    if (locked) await c.query(`select pg_advisory_unlock(hashtext($1))`, [job]).catch(() => {});
    c.release();
  }
}
