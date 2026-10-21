"use client";
// Explore state lives in the URL (shareable, Back walks changes). Reader prefs fill what the URL leaves out.
import { useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { apiParams, type FeedQuery } from "@/lib/feed/query";
import { effectiveQuery, queryToUrl, type Prefs } from "@/lib/prefs/prefs";

export interface ExploreState {
  query: FeedQuery;
  /** Canonical key for caches: the full effective query, independent of how the URL spelled it. */
  key: string;
  /** Push a history entry (Back undoes it). Drops an open paper sheet. */
  apply: (next: FeedQuery) => void;
  /** Same, without a history entry (typing in search). */
  replace: (next: FeedQuery) => void;
}

export function useExploreState(prefs: Prefs): ExploreState {
  const params = useSearchParams();
  const query = useMemo(() => effectiveQuery(params, prefs), [params, prefs]);
  const key = useMemo(() => apiParams(query), [query]);
  const go = useCallback((next: FeedQuery, mode: "push" | "replace") => {
    const qs = queryToUrl(next, prefs);
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (url === `${window.location.pathname}${window.location.search}`) return;
    if (mode === "push") window.history.pushState(null, "", url);
    else window.history.replaceState(null, "", url);
  }, [prefs]);
  const apply = useCallback((next: FeedQuery) => go(next, "push"), [go]);
  const replace = useCallback((next: FeedQuery) => go(next, "replace"), [go]);
  return { query, key, apply, replace };
}
