// Server-only paper queries. Cached ('use cache') and tagged so the ingest worker can revalidate them.
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "kysely";
import { getDb } from "@/lib/db/client";
import type { FeedPaper } from "./types";

const FEED_PAGE = 30;
export const FEED_WINDOW_DAYS = 30;

function toFeedPaper(r: Record<string, unknown>): FeedPaper {
  return {
    id: String(r.id), doi: (r.doi as string) ?? null, title: String(r.title), abstract: (r.abstract as string) ?? null,
    authors: String(r.authors_display ?? ""), authorCount: Number(r.author_count ?? 0),
    pubDate: String(r.pub_date), firstSeenAt: new Date(r.first_seen_at as string).toISOString(),
    isOa: Boolean(r.is_oa), oaUrl: (r.oa_url as string) ?? null, licence: (r.licence as string) ?? null,
    citedByCount: Number(r.cited_by_count ?? 0), topicIds: (r.topic_ids as number[]) ?? [], regionNames: (r.region_names as string[]) ?? [],
    isPreprint: Boolean(r.is_preprint), retraction: (r.retraction_status as FeedPaper["retraction"]) ?? "none",
    journal: { name: String(r.journal_name), abbreviation: String(r.journal_abbr), group: String(r.journal_group) },
  };
}

const baseSelect = () => getDb()
  .selectFrom("papers as p")
  .innerJoin("journals as j", "j.id", "p.journal_id")
  .select(["p.id", "p.doi", "p.title", "p.abstract", "p.authors_display", "p.author_count", "p.first_seen_at", "p.is_oa", "p.oa_url", "p.licence",
    "p.cited_by_count", "p.topic_ids", "p.is_preprint", "p.retraction_status",
    sql<string>`to_char(p.pub_date, 'YYYY-MM-DD')`.as("pub_date"),
    sql<string[]>`coalesce((select array_agg(r.name order by r.level desc, r.id) from regions r where r.id = any(p.region_ids) and r.level > 0), '{}')`.as("region_names"),
    "j.name as journal_name", "j.abbreviation as journal_abbr", "j.publisher_group as journal_group"])
  .where("p.published_version_id", "is", null);

export async function getFeed(): Promise<{ papers: FeedPaper[]; total: number; updatedAt: string | null }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed");
  const since = sql<string>`current_date - ${FEED_WINDOW_DAYS}::int`;
  const [rows, total, last] = await Promise.all([
    baseSelect().where("p.pub_date", ">=", since).orderBy("p.pub_date", "desc").orderBy("p.id", "desc").limit(FEED_PAGE).execute(),
    getDb().selectFrom("papers").select(sql<number>`count(*)::int`.as("n")).where("pub_date", ">=", since).where("published_version_id", "is", null).executeTakeFirst(),
    getDb().selectFrom("job_runs").select("finished_at").where("job", "=", "ingest_papers").where("status", "=", "succeeded")
    .orderBy("finished_at", "desc").limit(1).executeTakeFirst(),
  ]);
  return { papers: rows.map((r) => toFeedPaper(r as Record<string, unknown>)), total: total?.n ?? 0, updatedAt: last?.finished_at ? new Date(last.finished_at).toISOString() : null };
}

export async function getPaperByDoi(doi: string): Promise<FeedPaper | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("paper", `paper:${doi}`);
  const row = await baseSelect().where("p.doi", "=", doi).executeTakeFirst();
  return row ? toFeedPaper(row as Record<string, unknown>) : null;
}

export async function getPaperById(id: string): Promise<FeedPaper | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("paper", `paper-id:${id}`);
  const row = await baseSelect().where("p.id", "=", id).executeTakeFirst();
  return row ? toFeedPaper(row as Record<string, unknown>) : null;
}
