"use client";
// Choose the topics you follow (onboarding and Settings). Explore opens filtered to them; "t=all" in a URL still shows everything.
import { useId, useRef, useEffect, useState } from "react";
import { TOPICS, TOPIC_IDS, TOPIC_SLUGS } from "@/lib/topics";
import { TopicGlyph } from "@/components/paper/TopicRegister";

export function TopicPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <fieldset className="grid gap-1.5 sm:grid-cols-2">
      <legend className="sr-only">Topics you follow</legend>
      {TOPIC_IDS.map((id) => {
        const slug = TOPIC_SLUGS[id];
        const on = value.includes(slug);
        return (
          <label key={id} className={`press flex min-h-12 cursor-pointer items-center gap-2.5 rounded-control border px-3 text-body ${on ? "border-text bg-selected" : "border-border bg-surface"}`}>
            <input type="checkbox" checked={on} onChange={() => onChange(on ? value.filter((t) => t !== slug) : [...value, slug])} className="sr-only" />
            <TopicGlyph id={id} size={12} />
            <span className="min-w-0 flex-1">{TOPICS[id]}</span>
            <span aria-hidden="true" className={`size-4 flex-none rounded-full border ${on ? "border-text bg-text" : "border-border-input"}`} />
          </label>
        );
      })}
    </fieldset>
  );
}

/** First visit: a modal asking what the reader works on. Skipping is a full answer (shows everything). */
export function Onboarding({ open, initial, onDone }: { open: boolean; initial: string[]; onDone: (topics: string[]) => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [picked, setPicked] = useState<string[]>(initial);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="filter-dialog" aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); onDone([]); }}>
      <div className="flex max-h-[inherit] flex-col lg:h-full">
        <div className="flex-none px-5 pt-5 pb-3">
          <h2 id={titleId} className="text-sheet-title">What do you work on?</h2>
          <p className="mt-1 text-small text-text-muted">Pick the topics you follow and Explore opens on them. Change this any time in Settings.</p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-3"><TopicPicker value={picked} onChange={setPicked} /></div>
        <div className="pb-safe flex flex-none flex-col gap-2 border-t border-border px-5 pt-3">
          <button type="button" disabled={picked.length === 0} onClick={() => onDone(picked)}
            className="press min-h-12 w-full rounded-control bg-primary text-body font-bold text-on-primary disabled:opacity-40">
            {picked.length === 0 ? "Pick at least one topic" : `Show ${picked.length === 1 ? "this topic" : `these ${picked.length} topics`}`}
          </button>
          <button type="button" onClick={() => onDone([])} className="press mb-3 min-h-11 w-full rounded-control text-body text-text-muted">Skip, show every topic</button>
        </div>
      </div>
    </dialog>
  );
}
