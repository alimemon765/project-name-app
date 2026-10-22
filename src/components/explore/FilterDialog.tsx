"use client";
// A filter sheet (phone) / side panel (desktop) on the native <dialog>: focus trap, inert background and Esc for free.
// Changes are staged inside and applied when the sheet closes, however it closes (Done, scrim, Esc, Android Back),
// so every applied change is exactly one history entry and Back walks filter changes.
import { useEffect, useId, useRef } from "react";
import { Icon } from "@/components/icons";

interface Props {
  open: boolean;
  title: string;
  onDismiss: () => void;            // Done, Esc, scrim: the parent pops the sheet's history entry
  onClear?: () => void;
  clearDisabled?: boolean;
  children: React.ReactNode;
  toolbar?: React.ReactNode;        // e.g. the journal search field, kept above the scroller
}

export function FilterDialog({ open, title, onDismiss, onClear, clearDisabled, children, toolbar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="filter-dialog" aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onDismiss(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}>
      <div className="flex max-h-[inherit] flex-col lg:h-full">
        <div className="grid h-5 flex-none place-items-center lg:hidden" aria-hidden="true"><span className="h-[5px] w-9 rounded-full bg-border-strong" /></div>
        <div className="flex flex-none items-center gap-2 px-4 pb-2 lg:pt-4">
          <h2 id={titleId} tabIndex={-1} autoFocus className="flex-1 text-sheet-title outline-none">{title}</h2>
          {onClear && (
            <button type="button" onClick={onClear} disabled={clearDisabled}
              className="press min-h-11 rounded-control px-3 text-body text-text-muted disabled:opacity-40">Clear</button>
          )}
          <button type="button" onClick={onDismiss} aria-label="Close" className="press grid size-11 place-items-center rounded-full text-text-muted lg:hidden"><Icon name="close" /></button>
        </div>
        {toolbar && <div className="flex-none px-4 pb-2">{toolbar}</div>}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">{children}</div>
        <div className="pb-safe flex-none border-t border-border px-4 pt-3">
          <button type="button" onClick={onDismiss}
            className="press mb-3 min-h-12 w-full rounded-control bg-primary text-body font-bold text-on-primary">Done</button>
        </div>
      </div>
    </dialog>
  );
}

/** A 48px checkbox or radio row with a right-aligned tabular count; zero counts are muted (they still select). */
export function OptionRow({ type, name, checked, label, count, depth = 0, onChange, lead }: {
  type: "checkbox" | "radio"; name: string; checked: boolean; label: React.ReactNode; count?: number; depth?: number;
  onChange: () => void; lead?: React.ReactNode;
}) {
  return (
    <label className="flex min-h-12 min-w-0 cursor-pointer items-center gap-3 rounded-control px-2 hover:bg-raised" style={{ paddingLeft: `${8 + depth * 16}px` }}>
      <input type={type} name={name} checked={checked} onChange={onChange} className="size-5 flex-none accent-[var(--color-primary)]" />
      {lead}
      <span className="min-w-0 flex-1 text-body">{label}</span>
      {count !== undefined && (
        <span className="flex-none text-small tabular-nums text-text-muted">
          {new Intl.NumberFormat("en").format(count)}
        </span>
      )}
    </label>
  );
}
