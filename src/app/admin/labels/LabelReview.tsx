"use client";
import { useState, useTransition } from "react";
import { TOPICS, TOPIC_IDS } from "@/lib/topics";
import { TopicGlyph } from "@/components/paper/TopicRegister";
import { saveLabel } from "./actions";

export interface ReviewItem {
  id: string; title: string; abstract: string | null; venue: string; doi: string | null; predicted: number[];
  saved: { inScope: boolean; topicIds: number[] } | null;
}
type Saved = NonNullable<ReviewItem["saved"]>;

const btn = "press min-h-11 rounded-control border px-3 text-body";
const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

function verdict(item: ReviewItem, s: Saved): string {
  if (item.predicted.length === 0) return s.inScope ? `Should be in: ${s.topicIds.map((t) => TOPICS[t]).join(", ")}` : "Correctly left out";
  if (!s.inScope) return "Off-topic";
  return sameSet(s.topicIds, item.predicted) ? "Correct" : `Wrong topic → ${s.topicIds.map((t) => TOPICS[t]).join(", ")}`;
}

function Card({ item, index, onSaved }: { item: ReviewItem; index: number; onSaved: (s: Saved) => void }) {
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<number[]>(item.saved?.topicIds.length ? item.saved.topicIds : item.predicted);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const rejected = item.predicted.length === 0;
  const save = (s: Saved) => start(async () => {
    setError(null);
    const r = await saveLabel({ itemId: item.id, ...s });
    if (r.ok) { onSaved(s); setPicking(false); } else setError(r.error);
  });

  return (
    <li className="rounded-card border border-border bg-surface p-4">
      <p className="text-small text-text-muted">{index + 1} · <bdi>{item.venue}</bdi>{item.doi && <> · <a className="underline" href={`https://doi.org/${item.doi}`} target="_blank" rel="noreferrer">DOI</a></>}</p>
      <h2 className="mt-1 font-title text-card-title">{item.title}</h2>
      {item.abstract && (
        <>
          <p className={`mt-2 text-small ${open ? "" : "line-clamp-5"}`}>{item.abstract}</p>
          <button type="button" onClick={() => setOpen((v) => !v)} className="press min-h-9 text-small text-text-muted underline">{open ? "Show less" : "Show all"}</button>
        </>
      )}
      <p className="mt-2 text-small">
        <span className="text-text-muted">Classifier: </span>
        {rejected ? <strong>left out of the feed</strong> : item.predicted.map((t) => <span key={t} className="mr-2 inline-flex items-center gap-1"><TopicGlyph id={t} />{TOPICS[t]}</span>)}
      </p>

      {item.saved && !picking ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-body">
          <span className="rounded-chip bg-selected px-2 py-1 font-bold">{verdict(item, item.saved)}</span>
          <button type="button" onClick={() => setPicking(true)} className="press min-h-11 px-2 text-small text-text-muted underline">Change</button>
        </p>
      ) : picking ? (
        <div className="mt-3">
          <p className="mb-2 text-small text-text-muted">Pick every topic this paper belongs to:</p>
          <div className="grid gap-1 sm:grid-cols-2">
            {TOPIC_IDS.map((t) => (
              <label key={t} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-control px-2 hover:bg-raised">
                <input type="checkbox" className="size-5" checked={picked.includes(t)} onChange={() => setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))} />
                <TopicGlyph id={t} />{TOPICS[t]}
              </label>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={pending || picked.length === 0} onClick={() => save({ inScope: true, topicIds: picked })} className={`${btn} border-text bg-primary font-bold text-on-primary disabled:opacity-40`}>Save topics</button>
            <button type="button" onClick={() => setPicking(false)} className={`${btn} border-border`}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {rejected ? (
            <>
              <button type="button" disabled={pending} onClick={() => save({ inScope: false, topicIds: [] })} className={`${btn} border-border`}>Correctly left out</button>
              <button type="button" disabled={pending} onClick={() => { setPicked([]); setPicking(true); }} className={`${btn} border-border`}>Should be in…</button>
            </>
          ) : (
            <>
              <button type="button" disabled={pending} onClick={() => save({ inScope: true, topicIds: item.predicted })} className={`${btn} border-border`}>Correct</button>
              <button type="button" disabled={pending} onClick={() => setPicking(true)} className={`${btn} border-border`}>Wrong topic…</button>
              <button type="button" disabled={pending} onClick={() => save({ inScope: false, topicIds: [] })} className={`${btn} border-border`}>Off-topic</button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-small text-danger">{error}</p>}
    </li>
  );
}

export function LabelReview({ items: initial }: { items: ReviewItem[] }) {
  const [items, setItems] = useState(initial);
  const done = items.filter((i) => i.saved).length;
  return (
    <>
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] z-10 -mx-4 mb-3 bg-bg px-4 py-2 lg:top-0 lg:mx-0 lg:px-0">
        <p className="text-body font-bold" aria-live="polite">{done} of {items.length} reviewed</p>
        <div className="mt-1 h-1.5 rounded-full bg-raised"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${(done / items.length) * 100}%` }} /></div>
      </div>
      <ol className="flex flex-col gap-3 pb-10">
        {items.map((it, i) => (
          <Card key={it.id} item={it} index={i} onSaved={(s) => setItems((all) => all.map((x) => (x.id === it.id ? { ...x, saved: s } : x)))} />
        ))}
      </ol>
    </>
  );
}
