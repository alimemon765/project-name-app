"use client";
import { useSyncExternalStore } from "react";
import { useSaves } from "@/lib/saves/store";
import { PaperCard } from "@/components/paper/PaperCard";
import { PaperSheet } from "@/components/paper/PaperSheet";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";
import { useSheetParam } from "@/components/paper/useSheetParam";

export function SavedList() {
  const hydrated = useSyncExternalStore(useSaves.persist.onFinishHydration, () => useSaves.persist.hasHydrated(), () => false);
  const saved = useSaves((s) => s.saved);
  const sheet = useSheetParam();
  if (!hydrated) return null;
  const items = Object.values(saved).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const open = items.find(({ paper }) => paper.id === sheet.openId)?.paper ?? null;
  if (!items.length) return (
    <EmptyState title="Nothing saved yet" body="Tap the bookmark on any paper to keep it here. Saved papers stay on this device, even offline.">
      <Link href="/" className="press inline-flex min-h-11 items-center rounded-control border border-border bg-surface px-4 text-body no-underline text-text">Browse papers in Explore</Link>
    </EmptyState>
  );
  return (
    <>
      <p className="-mt-2.5 mb-3 text-small text-text-muted">{items.length} {items.length === 1 ? "paper" : "papers"} on this device</p>
      <ul className="flex max-w-[820px] flex-col gap-2">{items.map(({ paper }) => <li key={paper.id}><PaperCard paper={paper} isNew={false} onOpen={(paper) => sheet.open(paper.id)} /></li>)}</ul>
      <PaperSheet paper={open} onClose={sheet.close} />
    </>
  );
}
