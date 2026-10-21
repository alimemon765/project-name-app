"use client";
import { useSaves } from "@/lib/saves/store";
import type { FeedPaper } from "@/lib/papers/types";
import { Icon } from "@/components/icons";

export function SaveButton({ paper, size = 44 }: { paper: FeedPaper; size?: number }) {
  const saved = useSaves((s) => Boolean(s.saved[paper.id]));
  const toggle = useSaves((s) => s.toggle);
  return (
    <button type="button" aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save paper"}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(paper); }}
      className={`press relative z-10 grid flex-none place-items-center rounded-full ${saved ? "text-text" : "text-text-muted"}`} style={{ width: size, height: size }}>
      <Icon name="saved" filled={saved} />
    </button>
  );
}
