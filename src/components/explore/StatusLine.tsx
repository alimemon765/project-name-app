"use client";
// "Updated 9:40 am IST · 312 papers in the last 14 days", or the result count while searching.
import { LocalTime } from "@/components/LocalTime";
import type { FeedQuery } from "@/lib/feed/query";

export function StatusLine({ query, total, updatedAt, onlyNew }: { query: FeedQuery; total: number | null; updatedAt: string | null; onlyNew: boolean }) {
  const n = total === null ? null : new Intl.NumberFormat("en").format(total);
  const noun = total === 1 ? "paper" : "papers";
  const what = query.q
    ? <>{n ?? "…"} {total === 1 ? "result" : "results"} for “<bdi>{query.q}</bdi>” · all months</>
    : <>{n ?? "…"} {noun} in the last {query.days} days{onlyNew ? " · new only" : ""}</>;
  return (
    <p className="mb-3 min-h-5 text-small text-text-muted" aria-live="polite">
      {updatedAt && !query.q && <>Updated <LocalTime iso={updatedAt} /> · </>}{what}
    </p>
  );
}
