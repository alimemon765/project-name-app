"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { FeedPaper } from "@/lib/papers/types";
import { useSaves } from "@/lib/saves/store";
import { PaperCard } from "@/components/paper/PaperCard";
import { PaperSheet } from "@/components/paper/PaperSheet";
import { EmptyState } from "@/components/EmptyState";

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });   // "Tue 20 Oct"
const useHydrated = () => useSyncExternalStore(useSaves.persist.onFinishHydration, () => useSaves.persist.hasHydrated(), () => false);

export function FeedList({ papers }: { papers: FeedPaper[] }) {
  const hydrated = useHydrated();
  const baseline = useSaves((s) => (hydrated ? s.sessionBaseline : null));
  const markVisited = useSaves((s) => s.markVisited);
  const [onlyNew, setOnlyNew] = useState(false);
  const [open, setOpen] = useState<FeedPaper | null>(null);

  // Record this visit when the page is left (the baseline itself is frozen at rehydration, see store).
  useEffect(() => {
    const stamp = () => { if (document.visibilityState === "hidden") markVisited(new Date().toISOString()); };
    document.addEventListener("visibilitychange", stamp);
    window.addEventListener("pagehide", stamp);
    return () => { document.removeEventListener("visibilitychange", stamp); window.removeEventListener("pagehide", stamp); };
  }, [markVisited]);

  const isNew = (p: FeedPaper) => Boolean(baseline && p.firstSeenAt > baseline);
  const newCount = useMemo(() => (baseline ? papers.filter((p) => p.firstSeenAt > baseline).length : 0), [papers, baseline]);
  const shown = onlyNew ? papers.filter(isNew) : papers;

  return (
    <>
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-10 -mx-4 flex gap-2 overflow-x-auto bg-bg px-4 pt-1 pb-2.5 [scrollbar-width:none] lg:top-0 lg:mx-0 lg:px-0">
        {baseline && (
          <button type="button" aria-pressed={onlyNew} onClick={() => setOnlyNew((v) => !v)}
            className={`press inline-flex h-9 flex-none items-center gap-1 whitespace-nowrap rounded-chip border bg-surface px-3 text-body ${onlyNew ? "border-text" : "border-border"}`}>
            {newCount > 0
              ? <><span className="font-bold text-accent">{newCount}</span> new since {WEEKDAY.format(new Date(baseline))}</>
              : <span className="text-text-muted">Nothing new since {WEEKDAY.format(new Date(baseline))}</span>}
          </button>
        )}
        <span className="inline-flex h-9 flex-none items-center rounded-chip border border-border bg-surface px-3 text-body" title="More sorts and filters arrive in step 2">Newest first</span>
      </div>
      {shown.length === 0 ? (
        <EmptyState title={onlyNew ? "Nothing new since your last visit" : "No papers in the last 30 days yet"}
          body={onlyNew ? "Turn off the filter to see everything from the last 30 days." : "The next ingest runs within a few hours."} />
      ) : (
        <ul className="flex max-w-[820px] flex-col gap-2">
          {shown.map((p) => <li key={p.id}><PaperCard paper={p} isNew={isNew(p)} onOpen={setOpen} /></li>)}
        </ul>
      )}
      <PaperSheet paper={open} onClose={() => setOpen(null)} />
    </>
  );
}
