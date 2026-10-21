import { Suspense } from "react";
import { Explore } from "@/components/explore/Explore";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { getExplorePage, getExploreSummary } from "@/lib/papers/queries";
import { apiParams } from "@/lib/feed/query";
import { effectiveQuery } from "@/lib/prefs/prefs";
import { readPrefs } from "@/lib/prefs/server";

// The first page renders on the server for the URL and the reader's prefs cookie; the client takes over from there.
async function ExploreServer({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const [params, prefs] = await Promise.all([searchParams, readPrefs()]);
  const query = effectiveQuery(params, prefs);
  const first = await Promise.all([getExplorePage(query, null), getExploreSummary(query)]).catch((e: unknown) => {
    process.stderr.write(`[explore] ${e instanceof Error ? e.message : String(e)}\n`);
    return null;                                     // the client shows the error state with a retry
  });
  const initial = first ? { key: apiParams(query), page: { ...first[0], ...first[1] } } : null;
  return <Explore initialPrefs={prefs} initial={initial} />;
}

export default function ExplorePage(props: PageProps<"/">) {
  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-2 pb-3">
        <h1 className="text-h1">Explore</h1>
      </div>
      <Suspense fallback={<FeedSkeleton className="mt-16" />}>
        <ExploreServer searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
