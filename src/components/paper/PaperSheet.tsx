"use client";
import { useCallback, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { FeedPaper } from "@/lib/papers/types";
import { Spring, projectMomentum, rubberband } from "@/lib/motion/spring";
import { Icon } from "@/components/icons";
import { SaveButton } from "./SaveButton";
import { OpenArticle, PaperDetail } from "./PaperDetail";

// Motion tokens (replica/design/tokens.json motion.spring / gesture)
const OPEN = { damping: 1, response: 0.38 }, CLOSE = { damping: 1, response: 0.3 }, FLICK = { damping: 0.8, response: 0.32 }, SETTLE = { damping: 1, response: 0.32 };
const DRAG_THRESHOLD = 8, FLICK_VELOCITY = 600, MID_DETENT = 0.4;     // mid detent shows 60% of the sheet

export function PaperSheet({ paper, onClose }: { paper: FeedPaper | null; onClose: () => void }) {
  const sheet = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const spring = useRef<Spring | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const done = useCallback(() => onCloseRef.current(), []);
  const desktop = () => matchMedia("(min-width: 1024px)").matches;
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  const apply = useCallback((v: number) => {
    const el = sheet.current; if (!el) return;
    const span = desktop() ? el.offsetWidth : el.offsetHeight;
    el.style.transform = desktop() ? `translateX(${v}px)` : `translateY(${v}px)`;
    el.style.setProperty("--y", `${desktop() ? 0 : Math.max(0, v)}px`);         // keeps the action bar on the visible edge
    if (scrim.current) scrim.current.style.opacity = String(Math.max(0, Math.min(1, 1 - v / span)) * Number(getComputedStyle(document.documentElement).getPropertyValue("--scrim-opacity") || 0.3));
  }, []);

  const close = useCallback(() => {
    const el = sheet.current; const s = spring.current;
    if (!el || !s || reduced()) return done();
    s.to(desktop() ? el.offsetWidth : el.offsetHeight + 24, CLOSE, done);
  }, [done]);

  useEffect(() => {
    if (!paper) return;
    const el = sheet.current!;
    lastFocus.current = document.activeElement as HTMLElement;
    spring.current = new Spring(0, apply);
    const H = el.offsetHeight;
    if (reduced()) apply(desktop() ? 0 : H * MID_DETENT);
    else { spring.current.set(desktop() ? el.offsetWidth : H); spring.current.to(desktop() ? 0 : H * MID_DETENT, OPEN); }
    el.querySelector<HTMLElement>("[data-close]")?.focus({ preventScroll: true, focusVisible: false } as FocusOptions);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Make everything behind the dialog inert (focus + screen readers), not only trap Tab at the edges.
    const background = [...document.querySelectorAll<HTMLElement>("[data-behind-sheet]")];
    background.forEach((n) => n.setAttribute("inert", ""));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {                                    // focus trap
        const f = [...el.querySelectorAll<HTMLElement>("a[href],button:not([disabled]),[tabindex]:not([tabindex='-1'])")];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      background.forEach((n) => n.removeAttribute("inert"));
      spring.current?.stop();
      lastFocus.current?.focus?.({ preventScroll: true });
    };
  }, [paper, apply, close]);

  // Drag (phone): 1:1 tracking, rubber-band past the top, momentum projection + velocity handoff on release.
  useEffect(() => {
    const el = sheet.current; if (!paper || !el) return;
    let drag: { y0: number; start: number; samples: [number, number][]; committed: boolean; id: number } | null = null;
    const down = (e: PointerEvent) => {
      if (desktop() || reduced() || drag) return;
      const scroller = el.querySelector<HTMLElement>("[data-scroll]");
      const onGrab = (e.target as HTMLElement).closest("[data-grab]");
      if ((e.target as HTMLElement).closest("button,a")) return;
      if (!onGrab && scroller && scroller.scrollTop > 0) return;
      spring.current?.stop();                                    // interrupt from the presentation value
      drag = { y0: e.clientY, start: spring.current?.x ?? 0, samples: [[performance.now(), e.clientY]], committed: false, id: e.pointerId };
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dy = e.clientY - drag.y0;
      if (!drag.committed) { if (Math.abs(dy) < DRAG_THRESHOLD) return; drag.committed = true; el.setPointerCapture?.(e.pointerId); }
      let next = drag.start + dy;
      if (next < 0) next = -rubberband(-next, el.offsetHeight);
      if (spring.current) spring.current.x = next;
      apply(next);
      drag.samples.push([performance.now(), e.clientY]); if (drag.samples.length > 5) drag.samples.shift();
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const [t0, y0] = drag.samples[0], [t1, y1] = drag.samples[drag.samples.length - 1];
      const v = t1 > t0 ? ((y1 - y0) / (t1 - t0)) * 1000 : 0;
      const committed = drag.committed; drag = null;
      if (!committed || !spring.current) return;
      const H = el.offsetHeight, x = spring.current.x;
      const projected = x + projectMomentum(v);
      const stops = [0, H * MID_DETENT, H + 24];
      const target = stops.reduce((a, b) => (Math.abs(b - projected) < Math.abs(a - projected) ? b : a));
      if (target >= H) { spring.current.to(H + 24, { ...CLOSE, velocity: v }, done); return; }
      spring.current.to(target, { ...(Math.abs(v) > FLICK_VELOCITY ? FLICK : SETTLE), velocity: v });
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { el.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [paper, apply, done]);

  if (!paper || typeof document === "undefined") return null;
  // Portal to <body>: the background (header, nav, main) is made inert, so the dialog must live outside it.
  return createPortal(
    <>
      <div ref={scrim} onClick={close} className="fixed inset-0 z-40 bg-scrim opacity-0" aria-hidden="true" />
      <div ref={sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="fixed inset-x-0 bottom-0 z-50 flex h-[92dvh] flex-col rounded-t-sheet bg-sheet [box-shadow:var(--elev-float)] [touch-action:none] will-change-transform motion-reduce:transition-opacity lg:inset-y-0 lg:right-0 lg:left-auto lg:h-dvh lg:w-[min(560px,44vw)] lg:rounded-none lg:[touch-action:auto]">
        <div data-grab className="grid h-5 flex-none place-items-center lg:hidden" aria-hidden="true"><span className="h-[5px] w-9 rounded-full bg-border-strong" /></div>
        <div data-grab className="flex flex-none items-center px-2">
          <button data-close type="button" onClick={close} aria-label="Close" className="press grid size-11 place-items-center rounded-full text-text-muted"><Icon name="close" /></button>
          <span className="flex-1" />
          <SaveButton paper={paper} size={44} />
        </div>
        <div data-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-1 [touch-action:pan-y]">
          <PaperDetail paper={paper} titleId={titleId} />
        </div>
        <div className="pb-safe relative z-10 flex flex-none gap-2 border-t border-border bg-sheet px-4 pt-3 [transform:translateY(calc(-1*var(--y,0px)))]">
          <div className="flex w-full pb-3"><OpenArticle paper={paper} /></div>
        </div>
      </div>
    </>,
    document.body,
  );
}
