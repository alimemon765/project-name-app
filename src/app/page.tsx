import { Suspense } from "react";
import { getFeed } from "@/lib/papers/queries";
import { FeedList } from "@/components/feed/FeedList";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { EmptyState } from "@/components/EmptyState";
import { LocalTime } from "@/components/LocalTime";

async function Feed() {
  const result = await getFeed().catch(() => null);
  if (!result) return <EmptyState title="Couldn't load papers" body="The paper database didn't respond. Reload the page or try again in a minute." />;
  const { papers, total, updatedAt, nextCursor } = result;
  return (
      <>
        <p className="-mt-2.5 mb-3 text-small text-text-muted">
          {updatedAt && <>Updated <LocalTime iso={updatedAt} /> · </>}{new Intl.NumberFormat("en").format(total)} {total === 1 ? "paper" : "papers"} this month
        </p>
        <FeedList papers={papers} nextCursor={nextCursor} total={total} />
      </>
  );
}

export default function ExplorePage() {
  return (
    <>
      <div className="flex items-center justify-between gap-3 pt-2 pb-3">
        <h1 className="text-h1">Explore</h1>
      </div>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed />
      </Suspense>
    </>
  );
}
