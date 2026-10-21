// Explore queries: window + filters + sort with keyset paging, full-text search, facet counts, "new since".
// Takes a Kysely instance so the same code runs in the app (cached wrappers in papers/queries.ts) and in tests.
import { sql, type Kysely, type RawBuilder } from "kysely";
import type { Database } from "@/lib/db/types";
import type { FeedPaper } from "@/lib/papers/types";
import { selectFeedRows, toFeedPaper } from "@/lib/papers/rows";
import { decodeCursor, encodeCursor } from "./cursor";
import type { FeedQuery, Sort } from "./query";

export const PAGE_SIZE = 30;
const MAX_PAGE = 100;
const MAX_SEARCH_OFFSET = 1000;              // relevance pages by offset; nobody reads past result 1000
const MARK_OPEN = "\u0001";
const MARK_CLOSE = "\u0002";

type Facet = "topics" | "journals" | "regions" | "oa" | "preprints";

interface Resolved {
  query: FeedQuery;
  topicIds: number[] | null;      // null: facet not filtered; []: filtered by slugs that don't exist (matches nothing)
  journalIds: string[] | null;
  regionIds: number[] | null;
}

async function resolve(db: Kysely<Database>, query: FeedQuery): Promise<Resolved> {
  const [topics, journals, regions] = await Promise.all([
    query.topics.length ? db.selectFrom("topics").select("id").where("slug", "in", query.topics).execute() : null,
    query.journals.length ? db.selectFrom("journals").select("id").where("slug", "in", query.journals).execute() : null,
    query.regions.length ? db.selectFrom("regions").select("id").where("slug", "in", query.regions).execute() : null,
  ]);
  return {
    query,
    topicIds: topics ? topics.map((t) => t.id) : null,
    journalIds: journals ? journals.map((j) => j.id) : null,
    regionIds: regions ? regions.map((r) => r.id) : null,
  };
}

const tsQuery = (q: string) => sql`websearch_to_tsquery('english', ${q})`;

/** Every condition of the query except `except` (facet counts ignore their own facet). Alias `p` = papers. */
function filters(r: Resolved, except?: Facet): RawBuilder<boolean> {
  const { query } = r;
  const conds: RawBuilder<unknown>[] = [sql`p.published_version_id is null`];
  if (query.q) conds.push(sql`p.search_tsv @@ ${tsQuery(query.q)}`);
  else conds.push(sql`p.pub_date >= current_date - ${query.days}::int`);        // search covers everything we hold
  if (except !== "topics" && r.topicIds) conds.push(sql`p.topic_ids && ${r.topicIds}::smallint[]`);
  if (except !== "journals" && r.journalIds) conds.push(sql`p.journal_id = any(${r.journalIds}::uuid[])`);
  if (except !== "regions" && r.regionIds) conds.push(sql`p.region_ids && ${r.regionIds}::smallint[]`);
  if (except !== "oa" && query.oaOnly) conds.push(sql`p.is_oa`);
  if (except !== "preprints" && !query.preprints) conds.push(sql`not p.is_preprint`);
  return sql<boolean>`(${sql.join(conds, sql` and `)})`;
}

/** Filters that resolved to nothing (all slugs unknown) can't match any paper; skip the query. */
const matchesNothing = (r: Resolved) =>
  r.topicIds?.length === 0 || r.journalIds?.length === 0 || r.regionIds?.length === 0;

async function emptyTsQuery(db: Kysely<Database>, q: string): Promise<boolean> {
  if (!q) return false;
  const r = await sql<{ n: number }>`select numnode(${tsQuery(q)}) as n`.execute(db);
  return Number(r.rows[0]?.n ?? 0) === 0;
}

interface SortSpec { column: RawBuilder<unknown>; keyType: string; dir: "asc" | "desc" }
const SORT: Record<Exclude<Sort, "relevance">, SortSpec> = {
  new: { column: sql`p.pub_date`, keyType: "date", dir: "desc" },
  old: { column: sql`p.pub_date`, keyType: "date", dir: "asc" },
  cited: { column: sql`p.cited_by_count`, keyType: "int", dir: "desc" },
  trending: { column: sql`p.trending_score`, keyType: "float8::real", dir: "desc" },
};

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** ts_headline output -> HTML: escape everything, then turn our control-character markers into <mark>. */
export function highlightToHtml(marked: string): string {
  return escapeHtml(marked).replaceAll(MARK_OPEN, "<mark>").replaceAll(MARK_CLOSE, "</mark>");
}

export interface PageOptions { limit?: number; since?: Date }   // since: only papers first seen after it ("new only")

export async function explorePage(db: Kysely<Database>, query: FeedQuery, cursor: string | null, opts: PageOptions = {}):
  Promise<{ papers: FeedPaper[]; nextCursor: string | null }> {
  const empty = { papers: [], nextCursor: null };
  const limit = Math.min(Math.max(1, opts.limit ?? PAGE_SIZE), MAX_PAGE);
  const r = await resolve(db, query);
  if (matchesNothing(r) || (await emptyTsQuery(db, query.q))) return empty;
  const c = cursor ? decodeCursor(cursor) : null;
  if (cursor && (!c || c.sort !== query.sort)) return empty;                     // stale or foreign cursor

  let qb = selectFeedRows(db).where(filters(r));
  if (opts.since) qb = qb.where(sql<boolean>`p.first_seen_at > ${opts.since.toISOString()}::timestamptz`);
  if (query.q) {
    // Strip our marker characters from the source text so a title can never forge a <mark>.
    const opts = `StartSel=${MARK_OPEN}, StopSel=${MARK_CLOSE}`;
    qb = qb.select([
      sql<string>`ts_headline('english', translate(p.title, ${MARK_OPEN + MARK_CLOSE}, ''), ${tsQuery(query.q)}, ${`${opts}, HighlightAll=true`})`.as("title_hl"),
      sql<string | null>`case when p.abstract is null then null else ts_headline('english', translate(left(p.abstract, 5000), ${MARK_OPEN + MARK_CLOSE}, ''), ${tsQuery(query.q)}, ${`${opts}, MaxWords=35, MinWords=15, MaxFragments=1`}) end`.as("abstract_hl"),
    ]);
  }

  let offset = 0;
  if (query.sort === "relevance") {
    offset = c ? Number(c.key) : 0;
    if (!Number.isInteger(offset) || offset < 0 || offset > MAX_SEARCH_OFFSET) return empty;
    qb = qb.orderBy(sql`ts_rank_cd(p.search_tsv, ${tsQuery(query.q)})`, "desc").orderBy("p.pub_date", "desc").orderBy("p.id", "desc")
      .offset(offset);
  } else {
    const s = SORT[query.sort];
    if (c) {
      const key = sql`${c.key}::${sql.raw(s.keyType)}`;
      qb = qb.where(s.dir === "desc" ? sql<boolean>`(${s.column}, p.id) < (${key}, ${c.id}::uuid)` : sql<boolean>`(${s.column}, p.id) > (${key}, ${c.id}::uuid)`);
    }
    qb = qb.select(sql<string | number>`${query.sort === "trending" ? sql`p.trending_score::float8` : query.sort === "cited" ? sql`p.cited_by_count` : sql`to_char(p.pub_date, 'YYYY-MM-DD')`}`.as("sort_key"))
      .orderBy(s.column, s.dir).orderBy("p.id", s.dir);
  }

  let rows: Record<string, unknown>[];
  try {
    rows = (await qb.limit(limit + 1).execute()) as Record<string, unknown>[];
  } catch (e) {
    // A cursor key of the wrong type (e.g. a hand-edited date) fails the cast: treat it as a stale cursor.
    if (c && e instanceof Error && /invalid input syntax|out of range/i.test(e.message)) return empty;
    throw e;
  }
  const page = rows.slice(0, limit);
  const papers = page.map((row) => {
    const p = toFeedPaper(row);
    if (!query.q) return p;
    return { ...p, titleHtml: highlightToHtml(String(row.title_hl ?? p.title)),
      ...(row.abstract_hl ? { snippetHtml: highlightToHtml(String(row.abstract_hl)) } : {}) };
  });
  if (rows.length <= limit) return { papers, nextCursor: null };
  const last = page[page.length - 1];
  const nextCursor = query.sort === "relevance"
    ? (offset + limit <= MAX_SEARCH_OFFSET ? encodeCursor({ key: offset + limit, id: "rank", sort: "relevance" }) : null)
    : encodeCursor({ key: last.sort_key as string | number, id: String(last.id), sort: query.sort });
  return { papers, nextCursor };
}

async function countWhere(db: Kysely<Database>, where: RawBuilder<boolean>): Promise<number> {
  const r = await db.selectFrom("papers as p").select(sql<number>`count(*)::int`.as("n")).where(where).executeTakeFirst();
  return Number(r?.n ?? 0);
}

export async function exploreCount(db: Kysely<Database>, query: FeedQuery): Promise<number> {
  const r = await resolve(db, query);
  if (matchesNothing(r) || (await emptyTsQuery(db, query.q))) return 0;
  return countWhere(db, filters(r));
}

export async function exploreNewCount(db: Kysely<Database>, query: FeedQuery, since: Date): Promise<number> {
  const r = await resolve(db, query);
  if (matchesNothing(r) || (await emptyTsQuery(db, query.q))) return 0;
  return countWhere(db, sql<boolean>`${filters(r)} and p.first_seen_at > ${since.toISOString()}::timestamptz`);
}

export interface JournalFacet { slug: string; name: string; abbreviation: string; group: string; isPreprintServer: boolean; count: number }
export interface Facets {
  total: number;
  topics: Record<string, number>;     // slug -> papers that would match with this topic (other filters applied)
  regions: Record<string, number>;
  journals: JournalFacet[];           // every enabled journal, zero counts included, for the grouped sheet
  oa: number;                         // papers that would match with "open access only" on
  preprints: number;                  // preprints among the papers that would match with preprints shown
}

export async function exploreFacets(db: Kysely<Database>, query: FeedQuery): Promise<Facets> {
  const r = await resolve(db, query);
  const none = matchesNothing(r) || (await emptyTsQuery(db, query.q));
  // When a facet's own slugs are unknown, its counts are still meaningful (the facet is ignored for them).
  const facetOk = (f: Facet) => !none || (f === "topics" ? r.topicIds?.length === 0 && r.journalIds?.length !== 0 && r.regionIds?.length !== 0
    : f === "journals" ? r.journalIds?.length === 0 && r.topicIds?.length !== 0 && r.regionIds?.length !== 0
    : f === "regions" ? r.regionIds?.length === 0 && r.topicIds?.length !== 0 && r.journalIds?.length !== 0 : false);
  const unnestCounts = async (col: "topic_ids" | "region_ids", table: "topics" | "regions", facet: Facet) => {
    if (!facetOk(facet)) return {};
    const rows = await sql<{ slug: string; n: number }>`
      select t.slug, count(*)::int as n from papers p cross join lateral unnest(p.${sql.raw(col)}) as u(fid)
      join ${sql.table(table)} t on t.id = u.fid where ${filters(r, facet)} group by t.slug`.execute(db);
    return Object.fromEntries(rows.rows.map((x) => [x.slug, Number(x.n)]));
  };
  const journalCounts = async (): Promise<JournalFacet[]> => {
    const counts = facetOk("journals")
      ? sql`(select p.journal_id, count(*)::int as n from papers p where ${filters(r, "journals")} group by p.journal_id)`
      : sql`(select null::uuid as journal_id, 0 as n where false)`;
    const rows = await sql<{ slug: string; name: string; abbreviation: string; publisher_group: string; is_preprint_server: boolean; n: number }>`
      select j.slug, j.name, j.abbreviation, j.publisher_group, j.is_preprint_server, coalesce(c.n, 0)::int as n
      from journals j left join ${counts} c on c.journal_id = j.id
      where j.enabled order by j.is_preprint_server, j.publisher_group, j.sort_order`.execute(db);
    return rows.rows.map((j) => ({ slug: j.slug, name: j.name, abbreviation: j.abbreviation, group: j.publisher_group,
      isPreprintServer: j.is_preprint_server, count: Number(j.n) }));
  };
  const [total, topics, regions, journals, oa, preprints] = await Promise.all([
    none ? 0 : countWhere(db, filters(r)),
    unnestCounts("topic_ids", "topics", "topics"),
    unnestCounts("region_ids", "regions", "regions"),
    journalCounts(),
    none ? 0 : countWhere(db, sql<boolean>`${filters(r, "oa")} and p.is_oa`),
    none ? 0 : countWhere(db, sql<boolean>`${filters(r, "preprints")} and p.is_preprint`),
  ]);
  return { total, topics, regions, journals, oa, preprints };
}
