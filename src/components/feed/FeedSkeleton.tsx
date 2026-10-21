// Final layout with flat bars at real sizes; no shimmer, no layout shift (components.md: Skeleton).
export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="mt-12 flex flex-col gap-2" aria-busy="true" aria-label="Loading papers">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="rounded-card border border-border bg-surface p-3.5">
          <div className="flex items-center gap-2"><span className="size-7 rounded-chip bg-raised" /><span className="h-3 w-24 rounded bg-raised" /></div>
          <div className="mt-3 h-[18px] w-11/12 rounded bg-raised" /><div className="mt-1.5 h-[18px] w-7/12 rounded bg-raised" />
          <div className="mt-2.5 h-3 w-1/2 rounded bg-raised" /><div className="mt-3 h-3 w-40 rounded bg-raised" />
        </li>
      ))}
    </ul>
  );
}
