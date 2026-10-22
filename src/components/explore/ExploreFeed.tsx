"use client";
// The Explore list: keyset pages from /api/feed via TanStack Query, windowed with Virtuoso on the page's own scroll.
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { keepPreviousData, useInfiniteQuery, type UseInfiniteQueryResult, type InfiniteData } from "@tanstack/react-query";
import { Virtuoso } from "react-virtuoso";
import type { FeedPaper } from "@/lib/papers/types";
import type { FeedQuery } from "@/lib/feed/query";
import { PaperCard } from "@/components/paper/PaperCard";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { EmptyState } from "@/components/EmptyState";

export interface FeedResponse { papers: FeedPaper[]; nextCursor: string | null; total?: number; updatedAt?: string | null; error?: string }

async function fetchPage(key: string, cursor: string | null, since: string | null, signal: AbortSignal): Promise<FeedResponse> {
  const extra = `${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}${since ? `&since=${encodeURIComponent(since)}` : ""}`;
  const res = await fetch(`/api/feed?${key}${extra}`, { signal });
  const body = (await res.json().catch(() => ({}))) as FeedResponse;
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export type FeedPages = UseInfiniteQueryResult<InfiniteData<FeedResponse, string | null>, Error>;

/** Pages for one effective query. `since` = "new only". The server-rendered first page seeds the matching query. */
export function useFeedPages(queryKey: string, since: string | null, initial: { key: string; page: FeedResponse } | null): FeedPages {
  const useInitial = initial !== null && initial.key === queryKey && !since;
  return useInfiniteQuery({
    queryKey: ["feed", queryKey, since],
    queryFn: ({ pageParam, signal }) => fetchPage(queryKey, pageParam, since, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    initialData: useInitial ? { pages: [initial.page], pageParams: [null] } : undefined,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

interface Props {
  feed: FeedPages;
  papers: FeedPaper[];
  query: FeedQuery;
  since: string | null;
  isNew: (p: FeedPaper) => boolean;
  onOpen: (p: FeedPaper) => void;
  onClear: () => void;
  onWiden: (() => void) | null;
  widenTo: number | null;
  onSearchEverywhere: (() => void) | null;          // keep the words, drop the filters
  filterSummary: string;
}

const noop = () => () => {};
/** False on the server and during hydration, true after: Virtuoso renders nothing server-side, so page one is
 * server-rendered as a plain list and Virtuoso takes over once the page is interactive. (Virtuoso's own
 * initialItemCount marks those items as already "reached" and its endReached never fires: verified 2026-10-22.) */
const useClientReady = () => useSyncExternalStore(noop, () => true, () => false);

export function ExploreFeed({ feed, papers, query, since, isNew, onOpen, onClear, onWiden, widenTo, onSearchEverywhere, filterSummary }: Props) {
  // Virtuoso's endReached fires once per list length. If it lands while a fetch is in flight, keep the request and
  // run it when that fetch settles, so the list can't stall (and nothing loads before the reader reaches the end).
  const clientReady = useClientReady();
  const pending = useRef(false);
  const { hasNextPage, isFetching, isError, fetchNextPage } = feed;
  const loadMore = useCallback(() => {
    if (isFetching) { pending.current = true; return; }
    if (hasNextPage && !isError) void fetchNextPage();
  }, [isFetching, hasNextPage, isError, fetchNextPage]);
  useEffect(() => {
    if (!pending.current || isFetching) return;
    pending.current = false;
    if (hasNextPage && !isError) void fetchNextPage();
  }, [hasNextPage, isFetching, isError, fetchNextPage]);

  if (feed.isPending) return <FeedSkeleton className="mt-1" />;
  if (feed.isError && papers.length === 0) {
    return (
      <EmptyState title="Couldn't load papers" body="The paper database didn't answer. Check your connection, then try again.">
        <button type="button" onClick={() => feed.refetch()} className="press min-h-11 rounded-control border border-border bg-surface px-4 text-body">Try again</button>
      </EmptyState>
    );
  }
  if (papers.length === 0) {
    const searching = Boolean(query.q);
    return (
      <EmptyState
        title={searching ? `No results for “${query.q}”` : since ? "Nothing new under these filters" : "No papers match these filters"}
        body={searching ? `Searched titles, abstracts and authors across every month we hold${filterSummary ? `, limited to ${filterSummary}` : ""}.`
          : `Showing ${filterSummary || "everything"}.`}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onClear} className="press min-h-11 rounded-control border border-border bg-surface px-4 text-body">
            {searching ? "Clear search and filters" : "Clear filters"}
          </button>
          {onSearchEverywhere && <button type="button" onClick={onSearchEverywhere} className="press min-h-11 rounded-control border border-border bg-surface px-4 text-body">Search all papers for “{query.q}”</button>}
          {onWiden && <button type="button" onClick={onWiden} className="press min-h-11 rounded-control px-4 text-body text-text-muted underline underline-offset-4">Widen to {widenTo} days</button>}
        </div>
      </EmptyState>
    );
  }

  if (!clientReady) {
    return (
      <ul className="max-w-[820px]">
        {papers.map((p) => <li key={p.id} className="pb-2"><PaperCard paper={p} isNew={false} onOpen={onOpen} /></li>)}
      </ul>
    );
  }

  const end = query.q ? "That's every result." : since ? "That's everything new since your last visit." : `That's every paper from the last ${query.days} days.`;
  return (
    <div className={`max-w-[820px] transition-opacity duration-[var(--duration-fast)] ease-[var(--ease-out)] ${feed.isPlaceholderData ? "opacity-60" : ""}`} aria-busy={feed.isFetching}>
      <Virtuoso
        useWindowScroll
        data={papers}
        increaseViewportBy={{ top: 400, bottom: 800 }}
        computeItemKey={(_, p) => p.id}
        endReached={loadMore}
        itemContent={(_, p) => <div className="pb-2"><PaperCard paper={p} isNew={isNew(p)} onOpen={onOpen} /></div>}
        components={{
          Footer: () => (
            <div className="pb-6 text-center text-small text-text-muted">
              {feed.isFetchingNextPage && <FeedSkeleton count={3} className="mb-4 text-left" />}
              {feed.isError && (
                <p role="alert" className="py-4">Couldn&apos;t load more papers.{" "}
                  <button type="button" onClick={() => feed.fetchNextPage()} className="press min-h-11 px-2 underline underline-offset-4">Try again</button>
                </p>
              )}
              {!feed.hasNextPage && !feed.isFetching && <p className="py-4">{end}</p>}
            </div>
          ),
        }}
      />
    </div>
  );
}
