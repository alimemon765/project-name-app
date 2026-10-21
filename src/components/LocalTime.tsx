"use client";
import { useSyncExternalStore } from "react";

// Renders a time in the viewer's own time zone (server HTML carries the ISO string; no hydration mismatch).
// India's zone prints as "GMT+5:30" in most locales; readers there know it as IST.
const subscribe = () => () => {};
const INDIA = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

export function formatLocalTime(iso: string, timeZone?: string): string {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: tz }).format(new Date(iso));
  const zone = INDIA.has(tz) ? "IST"
    : new Intl.DateTimeFormat(undefined, { timeZoneName: "short", timeZone: tz }).formatToParts(new Date(iso)).find((p) => p.type === "timeZoneName")?.value ?? "";
  return zone ? `${time} ${zone}` : time;
}

export function LocalTime({ iso }: { iso: string }) {
  const label = useSyncExternalStore(subscribe, () => formatLocalTime(iso), () => "");
  return <time dateTime={iso}>{label}</time>;
}
