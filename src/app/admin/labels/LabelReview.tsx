"use client";
// One paper at a time: the paper on the left, my labels and the four answers on the right. Every answer autosaves and
// moves on; the page reopens at the first unanswered paper. Keys: 1 Correct, 2 Wrong topic, 3 Off-topic, S Skip, ←/→.
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { TOPICS, TOPIC_IDS } from "@/lib/topics";
import type { Verdict } from "@/lib/eval/review";
import { TopicGlyph } from "@/components/paper/TopicRegister";
import { exportReviews, saveReview } from "./actions";

export interface ReviewItem {
  id: string; title: string; abstract: string | null; venue: string; doi: string | null; year: string | null;
  reference: { inDomain: boolean; topicIds: number[]; regions: string[]; reason: string; unsure: boolean };
  answer: { verdict: Verdict; topicIds: number[]; note: string } | null;
}

const VERDICT_LABEL: Record<Verdict, string> = { correct: "Correct", wrong_topic: "Wrong topic", off_topic: "Off-topic", skip: "Skipped" };
const btn = "press min-h-11 rounded-control border px-3 text-body";

const startIndex = (items: ReviewItem[]) => Math.max(0, items.findIndex((i) => !i.answer));
const pickedFor = (it: ReviewItem) => (it.answer?.topicIds.length ? it.answer.topicIds : it.reference.topicIds);

export function LabelReview({ items: initial }: { items: ReviewItem[] }) {
  const [items, setItems] = useState(initial);
  const [index, setIndex] = useState(() => startIndex(initial));
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<number[]>(() => pickedFor(initial[startIndex(initial)]));
  const [note, setNote] = useState(() => initial[startIndex(initial)].answer?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [exported, setExported] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const inFlight = useRef(false);                 // render-time `pending` can lag a fast double press
  const item = items[index];
  const done = items.filter((i) => i.answer && i.answer.verdict !== "skip").length;
  const skipped = items.filter((i) => i.answer?.verdict === "skip").length;
  const correct = useMemo(() => items.filter((i) => i.answer?.verdict === "correct").length, [items]);

  // Moving to a paper loads its saved answer (or my labels as the starting point for "Wrong topic").
  const goTo = useCallback((next: number, list: ReviewItem[] = items) => {
    const i = Math.min(Math.max(next, 0), list.length - 1);
    setIndex(i);
    setPicking(false);
    setPicked(pickedFor(list[i]));
    setNote(list[i].answer?.note ?? "");
    setError(null);
  }, [items]);

  const indexRef = useRef(index);
  useEffect(() => { indexRef.current = index; }, [index]);
  const answer = useCallback((verdict: Verdict, topicIds: number[] = []) => {
    if (!item || inFlight.current) return;
    inFlight.current = true;
    const savedIndex = index;
    start(async () => {
      try {
        setError(null);
        const res = await saveReview({ itemId: item.id, verdict, topicIds, note });
        if (!res.ok) { setError(res.error); return; }
        const saved = { verdict, topicIds: verdict === "wrong_topic" ? topicIds : verdict === "correct" ? item.reference.topicIds : [], note };
        const next = items.map((x) => (x.id === item.id ? { ...x, answer: saved } : x));
        setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, answer: saved } : x)));
        // Advance only if the reader is still on the paper that was just saved.
        if (indexRef.current === savedIndex && savedIndex < next.length - 1) goTo(savedIndex + 1, next);
        else setPicking(false);
      } finally {
        inFlight.current = false;
      }
    });
  }, [item, note, index, items, goTo]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      // Ignore keys only while typing (the note); a focused topic checkbox must still accept Enter.
      if ((e.target as HTMLElement)?.closest("textarea, input:not([type=checkbox])")) return;
      if (picking) {
        // Enter saves only from the topic list itself, never from a focused button (Cancel, Previous, Next).
        const fromList = !(e.target as HTMLElement)?.closest("button, a") ;
        if (e.key === "Enter" && fromList && picked.length) { e.preventDefault(); answer("wrong_topic", picked); }
        if (e.key === "Escape") setPicking(false);
        return;
      }
      if (e.key === "1") answer("correct");
      else if (e.key === "2") setPicking(true);
      else if (e.key === "3") answer("off_topic");
      else if (e.key.toLowerCase() === "s") answer("skip");
      else if (e.key === "ArrowRight") goTo(index + 1);
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, goTo, index, picking, picked]);

  if (!item) return null;
  const ref = item.reference;
  return (
    <>
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-10 -mx-4 mb-4 bg-bg px-4 py-2 lg:top-0 lg:mx-0 lg:px-0">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <p className="text-body font-bold" aria-live="polite">Paper {index + 1} of {items.length}</p>
          <p className="text-small text-text-muted tabular-nums">{done} answered · {skipped} skipped{correct ? ` · ${correct} correct` : ""}</p>
          <span className="flex-1" />
          <button type="button" className={`${btn} border-border`} onClick={() => start(async () => {
            const r = await exportReviews();
            setExported(r.ok ? `Wrote ${r.rows} reviews to ${r.path}` : r.error);
          })}>Export CSV</button>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-raised" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done + skipped} aria-label="Reviews done">
          <div className="h-1.5 rounded-full bg-primary" style={{ width: `${((done + skipped) / items.length) * 100}%` }} />
        </div>
        {exported && <p className="mt-1 text-small text-text-muted" role="status">{exported}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <article className="min-w-0 rounded-card border border-border bg-surface p-5">
          <p className="text-small text-text-muted"><bdi>{item.venue}</bdi>{item.year && <> · {item.year}</>}
            {item.doi && <> · <a className="underline" href={`https://doi.org/${item.doi}`} target="_blank" rel="noreferrer">DOI</a></>}</p>
          <h2 className="mt-1 font-title text-sheet-title">{item.title}</h2>
          {item.abstract
            ? <p className="mt-4 max-w-[70ch] whitespace-pre-line text-abstract">{item.abstract}</p>
            : <p className="mt-4 text-small text-text-muted">No abstract from the source. Judge from the title.</p>}
        </article>

        <aside className="flex flex-col gap-3">
          <section className="rounded-card border border-border bg-surface p-4" aria-label="My labels">
            <p className="text-small text-text-muted">My labels{ref.unsure && <span className="ml-2 rounded-chip bg-raised px-2 py-0.5 text-meta text-text">I was unsure</span>}</p>
            <p className="mt-1 text-body font-bold">{ref.inDomain ? "In our field" : "Not our field"}</p>
            {ref.topicIds.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {ref.topicIds.map((t) => <li key={t} className="inline-flex items-center gap-1 rounded-chip bg-raised px-2 py-1 text-small"><TopicGlyph id={t} />{TOPICS[t]}</li>)}
              </ul>
            )}
            {ref.regions.length > 0 && <p className="mt-2 text-small text-text-muted">Regions: {ref.regions.join(", ")}</p>}
            <p className="mt-2 text-small">{ref.reason}</p>
          </section>

          <section className="rounded-card border border-border bg-surface p-4" aria-label="Your answer">
            {item.answer && !picking && <p className="mb-2 text-small">Saved: <strong>{VERDICT_LABEL[item.answer.verdict]}</strong>{item.answer.verdict === "wrong_topic" && <> → {item.answer.topicIds.map((t) => TOPICS[t]).join(", ")}</>}</p>}
            {picking ? (
              <>
                <p className="mb-2 text-small text-text-muted">It&apos;s in our field. Pick every topic it belongs to, then Save (Enter).</p>
                <div className="grid gap-0.5">
                  {TOPIC_IDS.map((t) => (
                    <label key={t} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-control px-2 text-small hover:bg-raised">
                      <input type="checkbox" className="size-4" checked={picked.includes(t)} onChange={() => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))} />
                      <TopicGlyph id={t} />{TOPICS[t]}
                    </label>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={pending || picked.length === 0} onClick={() => answer("wrong_topic", picked)} className={`${btn} border-text bg-primary font-bold text-on-primary disabled:opacity-40`}>Save topics</button>
                  <button type="button" onClick={() => setPicking(false)} className={`${btn} border-border`}>Cancel</button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={pending} onClick={() => answer("correct")} className={`${btn} border-border`}><kbd className="mr-1 text-text-muted">1</kbd>Correct</button>
                <button type="button" disabled={pending} onClick={() => setPicking(true)} className={`${btn} border-border`}><kbd className="mr-1 text-text-muted">2</kbd>Wrong topic</button>
                <button type="button" disabled={pending} onClick={() => answer("off_topic")} className={`${btn} border-border`}><kbd className="mr-1 text-text-muted">3</kbd>Off-topic</button>
                <button type="button" disabled={pending} onClick={() => answer("skip")} className={`${btn} border-border`}><kbd className="mr-1 text-text-muted">S</kbd>Skip</button>
              </div>
            )}
            <label className="mt-3 block text-small text-text-muted" htmlFor="review-note">Note (optional, saved with your answer)</label>
            <textarea id="review-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2}
              className="mt-1 w-full rounded-control border border-border-input bg-surface px-2 py-1.5 text-input" />
            {pending && <p className="mt-2 text-small text-text-muted" aria-live="polite">Saving…</p>}
            {error && <p role="alert" className="mt-2 text-small text-danger">{error}</p>}
          </section>

          <div className="flex gap-2">
            <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0} className={`${btn} flex-1 border-border disabled:opacity-40`}>← Previous</button>
            <button type="button" onClick={() => goTo(index + 1)} disabled={index === items.length - 1} className={`${btn} flex-1 border-border disabled:opacity-40`}>Next →</button>
          </div>
        </aside>
      </div>
    </>
  );
}
