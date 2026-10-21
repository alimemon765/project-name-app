"use client";
import { useSyncExternalStore } from "react";

// Renders a time in the viewer's own time zone (server HTML carries the ISO string; no hydration mismatch).
const subscribe = () => () => {};
export function LocalTime({ iso }: { iso: string }) {
  const label = useSyncExternalStore(subscribe,
    () => new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(iso)),
    () => "");
  return <time dateTime={iso}>{label}</time>;
}
