// Reader preferences that shape Explore's defaults (window, preprints, chosen topics, onboarding done).
// Kept in a small cookie so the server's first render already matches the reader (no flash of the wrong feed).
// Pure: no React, no Next. Format "d14-p0-o1-tflood-risk.subsidence" (cookie-safe, topics last).
import { FREE_WINDOWS, defaultSort, parseFeedQuery, type FeedQuery } from "@/lib/feed/query";

export type FreeWindow = (typeof FREE_WINDOWS)[number];
export interface Prefs { days: FreeWindow; showPreprints: boolean; myTopics: string[]; onboarded: boolean }

export const PREFS_COOKIE = "ph-prefs";
export const PREFS_MAX_AGE_S = 400 * 24 * 3600;           // browsers cap cookie lifetime at about 400 days
export const DEFAULT_PREFS: Prefs = Object.freeze({ days: 30, showPreprints: true, myTopics: [], onboarded: false }) as Prefs;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_TOPICS = 13;

export function encodePrefs(p: Prefs): string {
  return `d${p.days}-p${p.showPreprints ? 1 : 0}-o${p.onboarded ? 1 : 0}-t${p.myTopics.join(".")}`;
}

export function decodePrefs(raw: string | undefined | null): Prefs {
  const m = raw ? /^d(\d{1,2})-p([01])-o([01])-t(.*)$/.exec(raw) : null;
  if (!m) return DEFAULT_PREFS;
  const days = Number(m[1]);
  return {
    days: (FREE_WINDOWS as readonly number[]).includes(days) ? (days as FreeWindow) : DEFAULT_PREFS.days,
    showPreprints: m[2] === "1",
    onboarded: m[3] === "1",
    myTopics: [...new Set(m[4].split(".").filter((s) => s.length <= 60 && SLUG.test(s)))].slice(0, MAX_TOPICS),
  };
}

type Params = URLSearchParams | Record<string, string | string[] | undefined>;
const has = (p: Params, key: string) => (p instanceof URLSearchParams ? p.has(key) : p[key] !== undefined);
const first = (p: Params, key: string) => {
  const v = p instanceof URLSearchParams ? p.get(key) : p[key];
  return Array.isArray(v) ? v[0] : v ?? null;
};

/** The URL wins; the reader's prefs fill in window, preprints and topics when the URL leaves them out. `t=all` = every topic. */
export function effectiveQuery(params: Params, prefs: Prefs): FeedQuery {
  const q = parseFeedQuery(params);
  return {
    ...q,
    days: has(params, "days") ? q.days : prefs.days,
    preprints: has(params, "pre") ? q.preprints : prefs.showPreprints,
    topics: first(params, "t") === "all" ? [] : has(params, "t") ? q.topics : [...prefs.myTopics],
  };
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));

/** URL query string for `q`, writing only what differs from this reader's defaults (commas left readable). */
export function queryToUrl(q: FeedQuery, prefs: Prefs): string {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  if (q.topics.length === 0 && prefs.myTopics.length > 0) p.set("t", "all");
  else if (!sameSet(q.topics, prefs.myTopics)) p.set("t", [...q.topics].sort().join(","));
  if (q.journals.length) p.set("j", [...q.journals].sort().join(","));
  if (q.regions.length) p.set("r", [...q.regions].sort().join(","));
  if (q.oaOnly) p.set("oa", "1");
  if (q.preprints !== prefs.showPreprints) p.set("pre", q.preprints ? "1" : "0");
  if (q.sort !== defaultSort(q.q)) p.set("sort", q.sort);
  if (q.days !== prefs.days) p.set("days", String(q.days));
  return p.toString().replace(/%2C/g, ",");
}
