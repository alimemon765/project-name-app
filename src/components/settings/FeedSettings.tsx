"use client";
// Explore defaults: time window, preprints, and the topics the reader follows. Stored in the prefs cookie (D036).
import { useSyncExternalStore } from "react";
import { FREE_WINDOWS } from "@/lib/feed/query";
import { usePrefs } from "@/lib/prefs/client";
import { TopicPicker } from "@/components/explore/TopicPicker";

const subscribe = () => () => {};
const card = "rounded-card border border-border bg-surface p-4";

export function FeedSettings() {
  const [prefs, setPrefs] = usePrefs();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <>
      <fieldset className={card}>
        <legend className="sr-only">Time window</legend>
        <p className="text-body font-bold" aria-hidden="true">Time window</p>
        <p className="mt-0.5 mb-3 text-small text-text-muted">How far back Explore looks. Search always covers everything.</p>
        <div role="radiogroup" aria-label="Time window" className="flex gap-1 rounded-control bg-raised p-1">
          {FREE_WINDOWS.map((d) => {
            const on = mounted && prefs.days === d;
            return (
              <button key={d} type="button" role="radio" aria-checked={on} onClick={() => setPrefs({ days: d })}
                className={`press h-11 flex-1 rounded-chip text-body ${on ? "bg-surface text-text" : "text-text-muted"}`}>{d} days</button>
            );
          })}
        </div>
      </fieldset>

      <div className={`${card} flex items-center gap-4`}>
        <div className="min-w-0 flex-1">
          <p id="pre-label" className="text-body font-bold">Show preprints</p>
          <p id="pre-help" className="mt-0.5 text-small text-text-muted">arXiv, ESSOAr, EarthArXiv and SSRN papers that haven&apos;t been peer reviewed yet. They carry a Preprint badge.</p>
        </div>
        <button type="button" role="switch" aria-checked={mounted && prefs.showPreprints} aria-labelledby="pre-label" aria-describedby="pre-help"
          onClick={() => setPrefs({ showPreprints: !prefs.showPreprints })}
          className="press grid h-11 w-14 flex-none place-items-center">
          <span className={`relative h-5 w-8 rounded-full transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)] ${mounted && prefs.showPreprints ? "bg-primary" : "bg-border-input"}`}>
            <span className={`absolute top-0.5 left-0.5 size-4 rounded-full bg-surface transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)] ${mounted && prefs.showPreprints ? "translate-x-3" : ""}`} />
          </span>
        </button>
      </div>

      <section className={card} aria-labelledby="topics-title">
        <h2 id="topics-title" className="text-body font-bold">Your topics</h2>
        <p className="mt-0.5 mb-3 text-small text-text-muted">
          {prefs.myTopics.length ? "Explore opens on these. Clear them all to see every topic." : "None chosen: Explore shows every topic."}
        </p>
        {mounted && <TopicPicker plain value={prefs.myTopics} onChange={(next) => setPrefs({ myTopics: next, onboarded: true })} />}
      </section>
    </>
  );
}
