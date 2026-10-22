"use client";
// The sticky chip row: new-since, Clear all (when anything narrows the feed), the filter sheets, two one-tap toggles
// and sort. Active chips carry an ink border, so a phone reader can see what is applied without scrolling the row.
import { useLayoutEffect, useRef } from "react";
import { defaultSort, windowLabel, type FeedQuery } from "@/lib/feed/query";
import { TOPICS, TOPIC_ID_BY_SLUG } from "@/lib/topics";
import { REGION_TREE } from "@/lib/regions/tree";
import { Icon } from "@/components/icons";
import { SORT_LABEL } from "./FilterPanels";

export type SheetName = "window" | "topics" | "journals" | "regions" | "sort";
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });   // "Tue 20 Oct"
// 36px tall to the eye (components.md); the ::after extends the hit area to 44px.
const chip = "press relative inline-flex h-9 flex-none items-center gap-1 whitespace-nowrap rounded-chip border bg-surface px-3 text-body after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']";

function label(kind: "Topics" | "Journals" | "Regions", values: string[], name: (v: string) => string | undefined): string {
  if (values.length === 0) return kind;
  if (values.length === 1) return name(values[0]) ?? kind;
  return `${kind} · ${values.length}`;
}

interface Props {
  query: FeedQuery;
  defaultDays: number;                              // the reader's Settings default: the chip is "active" when it differs
  journalName: (slug: string) => string | undefined;
  baseline: string | null;
  newCount: number | null;
  onlyNew: boolean;
  onToggleNew: () => void;
  onOpen: (s: SheetName) => void;
  onApply: (q: FeedQuery) => void;
  onClear: () => void;
  canClear: boolean;
}

export function ChipRow({ query, defaultDays, journalName, baseline, newCount, onlyNew, onToggleNew, onOpen, onApply, onClear, canClear }: Props) {
  const row = useRef<HTMLDivElement>(null);
  // The new-since chip only appears after hydration; make sure the row then starts at its first chip.
  useLayoutEffect(() => { if (row.current) row.current.scrollLeft = 0; }, [baseline]);

  const sheetChip = (s: SheetName, text: string, active: boolean, extra = "") => (
    <button type="button" onClick={() => onOpen(s)} aria-haspopup="dialog" data-sheet={s} className={`${chip} ${extra} ${active ? "border-text" : "border-border"}`}>
      <span className="max-w-[16ch] truncate">{text}</span><Icon name="chevron" size={16} />
    </button>
  );
  return (
    <div ref={row} className="sticky top-[calc(56px+env(safe-area-inset-top))] z-10 -mx-4 flex gap-2 overflow-x-auto bg-bg px-4 pt-1 pb-2.5 [overflow-anchor:none] [scrollbar-width:none] lg:top-0 lg:mx-0 lg:flex-wrap lg:px-0">
      {query.q
        ? <span className={`${chip} border-border text-text-muted`} title="Search covers every month we hold">All months</span>
        : sheetChip("window", windowLabel(query.days), query.days !== defaultDays)}
      {baseline && (
        <button type="button" aria-pressed={onlyNew} onClick={onToggleNew} className={`${chip} tabular-nums ${onlyNew ? "border-text" : "border-border"}`}>
          {newCount === null ? <span className="text-text-muted">New since {WEEKDAY.format(new Date(baseline))}</span>
            : newCount > 0 ? <><span className="font-bold text-accent">{new Intl.NumberFormat("en").format(newCount)}</span> new since {WEEKDAY.format(new Date(baseline))}</>
            : <span className="text-text-muted">Nothing new since {WEEKDAY.format(new Date(baseline))}</span>}
        </button>
      )}
      {canClear && (
        <button type="button" onClick={onClear} className={`${chip} border-transparent bg-transparent text-text-muted underline underline-offset-4`}>Clear all</button>
      )}
      {/* Desktop filters topics with the rail (D039); the chip is for phones and tablets. */}
      {sheetChip("topics", label("Topics", query.topics, (s) => TOPICS[TOPIC_ID_BY_SLUG[s]]), query.topics.length > 0, "lg:hidden")}
      {sheetChip("journals", label("Journals", query.journals, journalName), query.journals.length > 0)}
      {sheetChip("regions", label("Regions", query.regions, (s) => REGION_TREE.find((r) => r.slug === s)?.name), query.regions.length > 0)}
      <button type="button" aria-pressed={query.oaOnly} onClick={() => onApply({ ...query, oaOnly: !query.oaOnly })}
        className={`${chip} ${query.oaOnly ? "border-text" : "border-border"}`}>
        {query.oaOnly && <Icon name="check" size={16} />}Open access
      </button>
      <button type="button" aria-pressed={!query.preprints} onClick={() => onApply({ ...query, preprints: !query.preprints })}
        className={`${chip} ${!query.preprints ? "border-text" : "border-border"}`}>
        {!query.preprints && <Icon name="check" size={16} />}Hide preprints
      </button>
      {sheetChip("sort", SORT_LABEL[query.sort], query.sort !== defaultSort(query.q))}
      <span className="w-4 flex-none lg:hidden" aria-hidden="true" />
    </div>
  );
}
