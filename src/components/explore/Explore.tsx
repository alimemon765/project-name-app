"use client";
// Explore: search, filters, sorts and the paper list. All state is in the URL (see useExploreState).
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { QueryClient, QueryClientProvider, keepPreviousData, useQuery } from "@tanstack/react-query";
import type { FeedPaper } from "@/lib/papers/types";
import type { Facets } from "@/lib/feed/explore";
import { apiParams, type FeedQuery } from "@/lib/feed/query";
import { effectiveQuery, queryToUrl, type Prefs } from "@/lib/prefs/prefs";
import { usePrefs } from "@/lib/prefs/client";
import { useSaves } from "@/lib/saves/store";
import { TOPICS, TOPIC_ID_BY_SLUG } from "@/lib/topics";
import { REGION_TREE } from "@/lib/regions/tree";
import { PaperSheet } from "@/components/paper/PaperSheet";
import { useSheetParam } from "@/components/paper/useSheetParam";
import { useExploreState } from "./useExploreState";
import { ExploreFeed, useFeedPages, type FeedResponse } from "./ExploreFeed";
import { SearchField } from "./SearchField";
import { StatusLine } from "./StatusLine";
import { ChipRow, type SheetName } from "./ChipRow";
import { FilterDialog } from "./FilterDialog";
import { JournalPanel, JournalSearch, RegionPanel, SortPanel, TopicPanel } from "./FilterPanels";
import { TopicRail } from "./TopicRail";
import { Onboarding } from "./TopicPicker";

export interface ExploreInitial { key: string; page: FeedResponse }

const useHydrated = () => useSyncExternalStore(useSaves.persist.onFinishHydration, () => useSaves.persist.hasHydrated(), () => false);
const desktopQuery = "(min-width: 1024px)";
const useDesktop = () => useSyncExternalStore(
  (fn) => { const m = matchMedia(desktopQuery); m.addEventListener("change", fn); return () => m.removeEventListener("change", fn); },
  () => matchMedia(desktopQuery).matches, () => false);

async function getJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

const SHEET_TITLE: Record<SheetName, string> = { topics: "Topics", journals: "Journals", regions: "Regions", sort: "Sort by" };

export function Explore(props: { initialPrefs: Prefs; initial: ExploreInitial | null }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  return <QueryClientProvider client={client}><ExploreInner {...props} /></QueryClientProvider>;
}

function ExploreInner({ initialPrefs, initial }: { initialPrefs: Prefs; initial: ExploreInitial | null }) {
  const [prefs, setPrefs] = usePrefs(initialPrefs);
  const { query, key, apply, replace } = useExploreState(prefs);
  const desktop = useDesktop();

  // "New since your last visit": the baseline is frozen when saves rehydrate (see saves/store).
  const hydrated = useHydrated();
  const baseline = useSaves((s) => (hydrated ? s.sessionBaseline : null));
  const markVisited = useSaves((s) => s.markVisited);
  const [onlyNew, setOnlyNew] = useState(false);
  const since = onlyNew && baseline ? baseline : null;
  useEffect(() => {
    const stamp = () => { if (document.visibilityState === "hidden") markVisited(new Date().toISOString()); };
    document.addEventListener("visibilitychange", stamp);
    window.addEventListener("pagehide", stamp);
    return () => { document.removeEventListener("visibilitychange", stamp); window.removeEventListener("pagehide", stamp); };
  }, [markVisited]);
  const newCount = useQuery({
    queryKey: ["new-count", key, baseline],
    queryFn: ({ signal }) => getJson<{ count: number; total: number }>(`/api/new-count?${key}&since=${encodeURIComponent(baseline!)}`, signal),
    enabled: Boolean(baseline), staleTime: 60_000,
  });

  const feed = useFeedPages(key, since, initial);
  const papers = useMemo(() => feed.data?.pages.flatMap((p) => p.papers) ?? [], [feed.data]);
  const firstPage = feed.data?.pages[0];
  // One source for both numbers when a baseline exists, so the chip can never exceed the total beside it.
  const total = since ? (newCount.data?.count ?? null) : (newCount.data?.total ?? firstPage?.total ?? null);

  // Filter sheets: staged edits, applied when the sheet's history entry pops (Done, scrim, Esc and Back all do it).
  const [sheet, setSheet] = useState<SheetName | null>(null);
  const [staged, setStaged] = useState<FeedQuery>(query);
  const [journalFilter, setJournalFilter] = useState("");
  const stagedRef = useRef(staged);
  useEffect(() => { stagedRef.current = staged; }, [staged]);
  const openSheet = useCallback((name: SheetName) => {
    setStaged(query); setJournalFilter(""); setSheet(name);
    window.history.pushState({ phSheet: name }, "", window.location.href);
  }, [query]);
  const dismiss = useCallback(() => window.history.back(), []);
  useEffect(() => {
    if (!sheet) return;
    const onPop = () => {
      setSheet(null);
      const next = stagedRef.current;
      setTimeout(() => apply(next), 0);                        // after the router has handled this popstate
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [sheet, apply]);

  const facetsKey = sheet ? apiParams(staged) : key;
  const facets = useQuery({
    queryKey: ["facets", facetsKey],
    queryFn: ({ signal }) => getJson<Facets>(`/api/facets?${facetsKey}`, signal),
    enabled: Boolean(sheet) || desktop, placeholderData: keepPreviousData, staleTime: 60_000,
  });
  const journalName = useCallback((slug: string) => facets.data?.journals.find((j) => j.slug === slug)?.abbreviation, [facets.data]);

  const defaults = useMemo(() => effectiveQuery(new URLSearchParams(), prefs), [prefs]);
  const canClear = queryToUrl(query, prefs) !== "";
  const clearAll = useCallback(() => { setOnlyNew(false); apply(defaults); }, [apply, defaults]);
  const filterSummary = describeFilters(query, journalName);

  const paperSheet = useSheetParam();
  const openPaper = papers.find((p) => p.id === paperSheet.openId) ?? null;
  const isNew = useCallback((p: FeedPaper) => Boolean(baseline && p.firstSeenAt > baseline), [baseline]);

  // Ask only on the plain Explore address: someone opening a shared search or filter link came for that link.
  const [onboardingOpen, setOnboardingOpen] = useState(() => !initialPrefs.onboarded && typeof window !== "undefined" && window.location.search === "");

  return (
    <div className="lg:grid lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-8">
      <TopicRail query={query} facets={facets.data} onApply={apply} />
      <div className="min-w-0">
        <div className="max-w-[820px] pb-3">
          <SearchField value={query.q} onSearch={(q) => replace({ ...query, q, sort: q ? (query.q ? query.sort : "relevance") : query.sort === "relevance" ? "new" : query.sort })}
            onCommit={(q) => apply({ ...query, q, sort: q ? (query.q ? query.sort : "relevance") : query.sort === "relevance" ? "new" : query.sort })} />
        </div>
        <StatusLine query={query} total={total} updatedAt={firstPage?.updatedAt ?? null} onlyNew={Boolean(since)} />
        <ChipRow query={query} journalName={journalName} baseline={baseline} newCount={newCount.data?.count ?? null}
          onlyNew={onlyNew} onToggleNew={() => setOnlyNew((v) => !v)} onOpen={openSheet} onApply={apply} onClear={clearAll} canClear={canClear || onlyNew} />
        <ExploreFeed feed={feed} papers={papers} query={query} since={since} isNew={isNew} onOpen={(p) => paperSheet.open(p.id)}
          onClear={clearAll} onWiden={!query.q && query.days < 30 ? () => apply({ ...query, days: 30 }) : null}
          onSearchEverywhere={query.q && filterSummary ? () => apply({ ...query, topics: [], journals: [], regions: [], oaOnly: false, preprints: true }) : null}
          filterSummary={filterSummary} />
      </div>

      <FilterDialog open={sheet !== null} title={sheet ? SHEET_TITLE[sheet] : ""} onDismiss={dismiss}
        onClear={sheet && sheet !== "sort" ? () => setStaged({ ...staged, [sheet]: [] }) : undefined}
        clearDisabled={sheet !== null && sheet !== "sort" && staged[sheet].length === 0}
        toolbar={sheet === "journals" ? <JournalSearch value={journalFilter} onChange={setJournalFilter} /> : undefined}>
        {sheet === "topics" && <TopicPanel staged={staged} setStaged={setStaged} facets={facets.data} />}
        {sheet === "journals" && <JournalPanel staged={staged} setStaged={setStaged} facets={facets.data} filter={journalFilter} />}
        {sheet === "regions" && <RegionPanel staged={staged} setStaged={setStaged} facets={facets.data} />}
        {sheet === "sort" && <SortPanel staged={staged} setStaged={setStaged} />}
      </FilterDialog>

      <Onboarding open={onboardingOpen} initial={prefs.myTopics}
        onDone={(topics) => { setPrefs({ myTopics: topics, onboarded: true }); setOnboardingOpen(false); }} />
      <PaperSheet paper={openPaper} onClose={paperSheet.close} />
    </div>
  );
}

/** Plain-language list of what narrows the feed, for empty states ("Hydrology, open access only, last 14 days"). */
export function describeFilters(q: FeedQuery, journalName: (slug: string) => string | undefined): string {
  const parts: string[] = [];
  if (q.topics.length) parts.push(q.topics.map((s) => TOPICS[TOPIC_ID_BY_SLUG[s]] ?? s).join(" or "));
  if (q.journals.length) parts.push(q.journals.length === 1 ? (journalName(q.journals[0]) ?? "1 journal") : `${q.journals.length} journals`);
  if (q.regions.length) parts.push(q.regions.map((s) => REGION_TREE.find((r) => r.slug === s)?.name ?? s).join(" or "));
  if (q.oaOnly) parts.push("open access only");
  if (!q.preprints) parts.push("no preprints");
  if (!q.q) parts.push(`the last ${q.days} days`);
  return parts.join(", ");
}
