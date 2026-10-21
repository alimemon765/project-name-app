// Server-only paper queries. Cached ('use cache') per argument and tagged "feed" / "paper" so the ingest
// worker can revalidate them. The query logic itself lives in feed/explore.ts (testable without Next).
import { cacheLife, cacheTag } from "next/cache";
import { getDb } from "@/lib/db/client";
import { exploreCount, exploreFacets, exploreNewCount, explorePage, type Facets } from "@/lib/feed/explore";
import type { FeedQuery } from "@/lib/feed/query";
import type { FeedPaper } from "./types";
import { selectFeedRows, toFeedPaper } from "./rows";

const baseSelect = () => selectFeedRows(getDb());

export interface ExplorePage { papers: FeedPaper[]; nextCursor: string | null }
export interface ExploreSummary { total: number; updatedAt: string | null }

/** `sinceIso` limits the page to papers first seen after it ("new only"); it is part of the cache key. */
export async function getExplorePage(query: FeedQuery, cursor: string | null, sinceIso: string | null = null): Promise<ExplorePage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed");
  return explorePage(getDb(), query, cursor, sinceIso ? { since: new Date(sinceIso) } : {});
}

/** Total for the status line, and when the journal ingest last finished. */
export async function getExploreSummary(query: FeedQuery): Promise<ExploreSummary> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed");
  const [total, last] = await Promise.all([
    exploreCount(getDb(), query),
    getDb().selectFrom("job_runs").select("finished_at").where("job", "=", "ingest_papers").where("status", "=", "succeeded")
      .orderBy("finished_at", "desc").limit(1).executeTakeFirst(),
  ]);
  return { total, updatedAt: last?.finished_at ? new Date(last.finished_at).toISOString() : null };
}

export async function getExploreFacets(query: FeedQuery): Promise<Facets> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed");
  return exploreFacets(getDb(), query);
}

/** Not cached: the baseline differs per visitor. Cheap (one indexed count). */
export async function getExploreNewCount(query: FeedQuery, since: Date): Promise<number> {
  return exploreNewCount(getDb(), query, since);
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
