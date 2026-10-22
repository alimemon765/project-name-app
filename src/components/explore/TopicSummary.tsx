"use client";
// "Showing: Storm surge and waves ✕, Subsidence ✕" above the feed on every size (D039): the topic filter is never hidden.
import type { FeedQuery } from "@/lib/feed/query";
import { TOPICS, TOPIC_ID_BY_SLUG } from "@/lib/topics";
import { TopicGlyph } from "@/components/paper/TopicRegister";
import { Icon } from "@/components/icons";

export function TopicSummary({ query, onApply }: { query: FeedQuery; onApply: (q: FeedQuery) => void }) {
  const known = query.topics.filter((s) => s in TOPIC_ID_BY_SLUG);
  if (known.length === 0) return null;
  return (
    <p className="mb-2 flex max-w-[820px] flex-wrap items-center gap-x-1.5 gap-y-1 text-small text-text-muted">
      <span>Showing:</span>
      {known.map((slug) => {
        const id = TOPIC_ID_BY_SLUG[slug];
        return (
          <button key={slug} type="button" onClick={() => onApply({ ...query, topics: query.topics.filter((t) => t !== slug) })}
            aria-label={`Remove ${TOPICS[id]}`}
            className="press relative inline-flex min-h-7 items-center gap-1 rounded-chip bg-raised px-2 text-small text-text after:absolute after:-inset-2 after:content-['']">
            <TopicGlyph id={id} />{TOPICS[id]}<Icon name="close" size={14} />
          </button>
        );
      })}
    </p>
  );
}
