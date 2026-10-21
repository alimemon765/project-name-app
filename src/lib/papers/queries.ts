// Server-only paper queries. Cached ('use cache') and tagged so the ingest worker can revalidate them.
import { cacheLife, cacheTag } from "next/cache";
import { sql } from "kysely";
import { getDb } from "@/lib/db/client";
import type { FeedPaper } from "./types";
import { selectFeedRows, toFeedPaper } from "./rows";
import { decodeCursor, encodeCursor } from "@/lib/feed/cursor";

const FEED_PAGE = 30;
export const FEED_WINDOW_DAYS = 30;

const baseSelect = () => selectFeedRows(getDb());

export async function getFeed(): Promise<{ papers: FeedPaper[]; total: number; updatedAt: string | null; nextCursor: string | null }> {
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
  const papers = rows.map((r) => toFeedPaper(r as Record<string, unknown>));
  const tail = papers[papers.length - 1];
  const nextCursor = (total?.n ?? 0) > papers.length && tail ? encodeCursor({ key: tail.pubDate, id: tail.id }) : null;
  return { papers, total: total?.n ?? 0, updatedAt: last?.finished_at ? new Date(last.finished_at).toISOString() : null, nextCursor };
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

/** Next feed page after a keyset cursor (pub_date desc, id desc). No OFFSET. */
export async function getFeedPage(cursor: string | null): Promise<{ papers: FeedPaper[]; nextCursor: string | null }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed");
  const c = decodeCursor(cursor);
  if (!c || typeof c.key !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(c.key)) return { papers: [], nextCursor: null };
  const since = sql<string>`current_date - ${FEED_WINDOW_DAYS}::int`;
  const rows = await baseSelect().where("p.pub_date", ">=", since)
    .where(sql<boolean>`(p.pub_date, p.id) < (${c.key}::date, ${c.id}::uuid)`)
    .orderBy("p.pub_date", "desc").orderBy("p.id", "desc").limit(FEED_PAGE + 1).execute();
  const papers = rows.slice(0, FEED_PAGE).map((r) => toFeedPaper(r as Record<string, unknown>));
  const last = papers[papers.length - 1];
  return { papers, nextCursor: rows.length > FEED_PAGE && last ? encodeCursor({ key: last.pubDate, id: last.id }) : null };
}
