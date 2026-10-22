"use client";
// Desktop: the 13 topics as a persistent left rail with live counts; one click filters (each click is one history entry).
import type { FeedQuery } from "@/lib/feed/query";
import type { Facets } from "@/lib/feed/explore";
import { TOPICS, TOPIC_IDS, TOPIC_SLUGS } from "@/lib/topics";
import { TopicGlyph } from "@/components/paper/TopicRegister";

export function TopicRail({ query, facets, onApply }: { query: FeedQuery; facets: Facets | undefined; onApply: (q: FeedQuery) => void }) {
  const selected = new Set(query.topics);
  const row = "press flex min-h-9 w-full items-center gap-2.5 rounded-control px-2.5 text-left text-body";
  return (
    <nav aria-label="Filter by topic" className="sticky top-4 hidden max-h-[calc(100dvh-2rem)] overflow-y-auto pb-6 lg:block">
      <div className="flex items-baseline justify-between px-2.5 pb-2">
        <h2 className="text-body font-bold">Topics</h2>
        {selected.size > 0 && (
          <button type="button" onClick={() => onApply({ ...query, topics: [] })} className="press min-h-9 px-1 text-small text-text-muted underline underline-offset-4">Clear</button>
        )}
      </div>
      <ul>
        <li>
          <button type="button" aria-pressed={selected.size === 0} onClick={() => onApply({ ...query, topics: [] })}
            className={`${row} ${selected.size === 0 ? "bg-selected font-bold" : "hover:bg-raised"}`}>All topics</button>
        </li>
        {TOPIC_IDS.map((id) => {
          const slug = TOPIC_SLUGS[id];
          const on = selected.has(slug);
          const count = facets ? (facets.topics[slug] ?? 0) : undefined;
          return (
            <li key={id}>
              <button type="button" aria-pressed={on}
                onClick={() => onApply({ ...query, topics: on ? query.topics.filter((t) => t !== slug) : [...query.topics, slug] })}
                className={`${row} ${on ? "bg-selected font-bold" : "hover:bg-raised"}`}>
                <TopicGlyph id={id} size={12} />
                <span className="min-w-0 flex-1 truncate">{TOPICS[id]}</span>
                {count !== undefined && <span className="flex-none text-small font-normal tabular-nums text-text-muted"><span className="sr-only">, </span>{new Intl.NumberFormat("en").format(count)}<span className="sr-only"> {count === 1 ? "paper" : "papers"}</span></span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
