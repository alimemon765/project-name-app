"use client";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const OPTIONS = [["system", "Match device"], ["light", "Light"], ["dark", "Dark"]] as const;
const subscribe = () => () => {};

export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <fieldset className="rounded-card border border-border bg-surface p-4">
      <legend className="sr-only">Appearance</legend>
      <p className="mb-3 text-body font-bold" aria-hidden="true">Appearance</p>
      <div role="radiogroup" aria-label="Appearance" className="flex gap-1 rounded-control bg-raised p-1">
        {OPTIONS.map(([value, label]) => {
          const on = mounted && theme === value;
          return (
            <button key={value} type="button" role="radio" aria-checked={on} onClick={() => setTheme(value)}
              className={`press h-11 flex-1 rounded-[6px] text-body ${on ? "bg-surface text-text" : "text-text-muted"}`}>{label}</button>
          );
        })}
      </div>
    </fieldset>
  );
}
