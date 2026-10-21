"use client";
// Reader preferences in the browser: read from and written to the prefs cookie, shared across components.
import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_PREFS, PREFS_COOKIE, PREFS_MAX_AGE_S, decodePrefs, encodePrefs, type Prefs } from "./prefs";

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedPrefs: Prefs = DEFAULT_PREFS;

function readRaw(): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${PREFS_COOKIE}=([^;]*)`));
  return m ? m[1] : null;
}

function snapshot(): Prefs {
  const raw = readRaw();
  if (raw !== cachedRaw) { cachedRaw = raw; cachedPrefs = decodePrefs(raw); }
  return cachedPrefs;
}

const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };

/** `initial` is what the server rendered with (from the same cookie), so hydration matches. */
export function usePrefs(initial: Prefs = DEFAULT_PREFS): [Prefs, (next: Partial<Prefs>) => void] {
  const prefs = useSyncExternalStore(subscribe, snapshot, () => initial);
  const update = useCallback((next: Partial<Prefs>) => {
    const merged = { ...snapshot(), ...next };
    document.cookie = `${PREFS_COOKIE}=${encodePrefs(merged)}; Path=/; Max-Age=${PREFS_MAX_AGE_S}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    listeners.forEach((fn) => fn());
  }, []);
  return [prefs, update];
}
