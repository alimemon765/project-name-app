"use client";
import { useState, useSyncExternalStore } from "react";
import { useSaves } from "@/lib/saves/store";
import type { FeedPaper } from "@/lib/papers/types";
import { PaperCard } from "@/components/paper/PaperCard";
import { PaperSheet } from "@/components/paper/PaperSheet";
import { EmptyState } from "@/components/EmptyState";

export function SavedList() {
  const hydrated = useSyncExternalStore(useSaves.persist.onFinishHydration, () => useSaves.persist.hasHydrated(), () => false);
  const saved = useSaves((s) => s.saved);
  const [open, setOpen] = useState<FeedPaper | null>(null);
  if (!hydrated) return null;
  const items = Object.values(saved).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  if (!items.length) return <EmptyState title="Nothing saved yet" body="Tap the bookmark on any paper to keep it here. Saved papers stay on this device, even offline." />;
  return (
    <>
      <p className="-mt-2.5 mb-3 text-small text-text-muted">{items.length} {items.length === 1 ? "paper" : "papers"} on this device</p>
      <ul className="flex max-w-[820px] flex-col gap-2">{items.map(({ paper }) => <li key={paper.id}><PaperCard paper={paper} isNew={false} onOpen={setOpen} /></li>)}</ul>
      <PaperSheet paper={open} onClose={() => setOpen(null)} />
    </>
  );
}
