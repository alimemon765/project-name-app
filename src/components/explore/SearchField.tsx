"use client";
// Search: typing updates the URL in place (no history entry per keystroke); Enter commits one entry.
// A pasted or typed DOI opens that paper instead of searching.
import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { detectDoi } from "@/lib/feed/query";
import { Icon } from "@/components/icons";

const DEBOUNCE_MS = 350;

export function SearchField({ value, onSearch, onCommit }: { value: string; onSearch: (q: string) => void; onCommit: (q: string) => void }) {
  const router = useRouter();
  const [text, setText] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const helpId = useId();
  // Follow the URL when it changes from outside (Back, Clear all), without fighting the reader's typing.
  if (value !== lastValue) { setLastValue(value); setText(value); }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  // "/" jumps to search from anywhere on Explore (not while typing elsewhere, not with a modifier, not under a dialog).
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable=true], dialog[open]") || document.querySelector("dialog[open], [role=dialog][aria-modal=true]")) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const openDoi = (raw: string): boolean => {
    const doi = detectDoi(raw);
    if (!doi) return false;
    router.push(`/paper/${doi}`);
    return true;
  };
  const change = (next: string) => {
    setText(next);
    if (timer.current) clearTimeout(timer.current);
    if (detectDoi(next)) return;                                  // wait for Enter; don't search for a DOI string
    timer.current = setTimeout(() => onSearch(next.trim()), DEBOUNCE_MS);
  };
  const doi = detectDoi(text);

  return (
    <form role="search" className="relative" onSubmit={(e) => {
      e.preventDefault();
      if (timer.current) clearTimeout(timer.current);
      if (!openDoi(text)) onCommit(text.trim());
      (document.activeElement as HTMLElement | null)?.blur();      // close the phone keyboard to show results
    }}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-text-muted"><Icon name="search" size={18} /></span>
      <input ref={input} data-search type="search" enterKeyHint="search" value={text} placeholder="Search papers" aria-label="Search papers" aria-describedby={helpId}
        autoComplete="off" autoCorrect="off" spellCheck={false}
        onChange={(e) => change(e.target.value)}
        onPaste={(e) => { const pasted = e.clipboardData.getData("text"); if (detectDoi(pasted) && !text) { e.preventDefault(); openDoi(pasted); } }}
        className="h-11 w-full rounded-control bg-raised pr-11 pl-10 text-input outline-none placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-focus lg:h-9 [&::-webkit-search-cancel-button]:hidden" />
      {text && (
        <button type="button" aria-label="Clear search" onClick={() => { setText(""); if (timer.current) clearTimeout(timer.current); onCommit(""); }}
          className="press absolute top-1/2 right-0 grid size-11 -translate-y-1/2 place-items-center text-text-muted lg:size-9"><Icon name="close" size={16} /></button>
      )}
      <p id={helpId} className="sr-only">Searches titles, abstracts and authors across every month we hold. Paste a DOI to open that paper. Press slash to jump here.</p>
      {doi && <p className="mt-1.5 text-small text-text-muted">Press Enter to open the paper with DOI <bdi>{doi}</bdi>.</p>}
    </form>
  );
}
