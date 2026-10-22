"use client";
// The contents of each filter sheet. They edit a staged copy of the query; counts come from /api/facets for that copy.
import { useMemo, useState } from "react";
import type { FeedQuery, Sort } from "@/lib/feed/query";
import type { Facets, JournalFacet } from "@/lib/feed/explore";
import { TOPICS, TOPIC_IDS, TOPIC_SLUGS } from "@/lib/topics";
import { REGION_TREE } from "@/lib/regions/tree";
import { TopicGlyph } from "@/components/paper/TopicRegister";
import { OptionRow } from "./FilterDialog";

interface PanelProps { staged: FeedQuery; setStaged: (q: FeedQuery) => void; facets: Facets | undefined }

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function TopicPanel({ staged, setStaged, facets }: PanelProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Topics</legend>
      {TOPIC_IDS.map((id) => {
        const slug = TOPIC_SLUGS[id];
        return (
          <OptionRow key={id} type="checkbox" name="topic" checked={staged.topics.includes(slug)} label={TOPICS[id]}
            count={facets?.topics[slug] ?? (facets ? 0 : undefined)} lead={<TopicGlyph id={id} size={12} />}
            onChange={() => setStaged({ ...staged, topics: toggle(staged.topics, slug) })} />
        );
      })}
    </fieldset>
  );
}

export function JournalSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Find a journal"
      aria-label="Find a journal by name or abbreviation"
      className="h-11 w-full rounded-control border border-border-input bg-raised px-3 text-input outline-none focus-visible:ring-2 focus-visible:ring-focus" />
  );
}

export function JournalPanel({ staged, setStaged, facets, filter }: PanelProps & { filter: string }) {
  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const list = (facets?.journals ?? []).filter((j) => !needle || j.name.toLowerCase().includes(needle) || j.abbreviation.toLowerCase().includes(needle));
    const byGroup = new Map<string, JournalFacet[]>();
    for (const j of list) {
      const g = j.isPreprintServer ? "Preprint servers" : j.group;
      byGroup.set(g, [...(byGroup.get(g) ?? []), j]);
    }
    return [...byGroup.entries()];
  }, [facets, filter]);
  if (!facets) return <p className="px-2 py-4 text-small text-text-muted">Loading journals…</p>;
  if (groups.length === 0) return <p className="px-2 py-4 text-small text-text-muted">No journal matches “{filter}”.</p>;
  return (
    <>
      {groups.map(([group, journals]) => (
        <fieldset key={group} className="mb-2 min-w-0">
          <legend className="px-2 pt-3 pb-1 text-small font-bold text-text-muted">{group}</legend>
          {journals.map((j) => (
            <OptionRow key={j.slug} type="checkbox" name="journal" checked={staged.journals.includes(j.slug)} count={j.count}
              label={<span className="line-clamp-2 [overflow-wrap:anywhere]">{j.name}</span>}
              onChange={() => setStaged({ ...staged, journals: toggle(staged.journals, j.slug) })} />
          ))}
        </fieldset>
      ))}
    </>
  );
}

export function RegionPanel({ staged, setStaged, facets }: PanelProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Regions</legend>
      {REGION_TREE.map((r) => (
        <OptionRow key={r.slug} type="checkbox" name="region" checked={staged.regions.includes(r.slug)} label={r.name} depth={r.depth}
          count={facets?.regions[r.slug] ?? (facets ? 0 : undefined)}
          onChange={() => setStaged({ ...staged, regions: toggle(staged.regions, r.slug) })} />
      ))}
    </fieldset>
  );
}

// In our own words: what each order does and its trade-off.
export const SORT_LABEL: Record<Sort, string> = { relevance: "Best match", new: "Newest", old: "Oldest", cited: "Most cited", trending: "Trending" };
const SORT_HELP: Record<Sort, string> = {
  relevance: "Closest match to your words in the title first, then the abstract and authors. Ties go to the newer paper.",
  new: "Latest publication date first.",
  old: "Earliest publication date in the window first: useful for catching up from where you left off.",
  cited: "Highest citation count first. Citations take months to arrive, so new papers sit low here.",
  trending: "Citations gained per month since publication, so recent papers that are already being picked up rise to the top.",
};

export function SortPanel({ staged, setStaged }: Omit<PanelProps, "facets">) {
  const sorts: Sort[] = staged.q ? ["relevance", "new", "old", "cited", "trending"] : ["new", "old", "cited", "trending"];
  const [howOpen, setHowOpen] = useState(false);
  return (
    <>
      <fieldset className="min-w-0">
        <legend className="sr-only">Sort papers by</legend>
        {sorts.map((s) => (
          <OptionRow key={s} type="radio" name="sort" checked={staged.sort === s} label={SORT_LABEL[s]} onChange={() => setStaged({ ...staged, sort: s })} />
        ))}
      </fieldset>
      <details className="mx-2 mt-2 rounded-control bg-raised px-3 py-2" open={howOpen} onToggle={(e) => setHowOpen(e.currentTarget.open)}>
        <summary className="min-h-9 cursor-pointer py-1.5 text-body">How sorting works</summary>
        <dl className="pb-2 text-small">
          {sorts.map((s) => (
            <div key={s} className="mt-2"><dt className="font-bold">{SORT_LABEL[s]}</dt><dd className="text-text-muted">{SORT_HELP[s]}</dd></div>
          ))}
          <p className="mt-3 text-text-muted">Citation counts come from OpenAlex.</p>
        </dl>
      </details>
    </>
  );
}
