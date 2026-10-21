// The Explore query: one shape shared by the URL, the /api/feed route and the SQL builder.
// Parsing is lenient (a hand-edited URL never errors): invalid values are dropped or clamped to defaults.
import { normalizeDoi } from "@/lib/papers/doi";

export const SORTS = ["new", "old", "cited", "trending", "relevance"] as const;
export type Sort = (typeof SORTS)[number];
export const FREE_WINDOWS = [7, 14, 30] as const;
export const DEFAULT_DAYS = 30;
export const MAX_DAYS = 90;
const MAX_LIST = 50;
const MAX_Q = 200;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG = 60;

export interface FeedQuery {
  q: string;
  topics: string[];       // topic slugs
  journals: string[];     // journal slugs
  regions: string[];      // region slugs
  oaOnly: boolean;
  preprints: boolean;     // false hides preprints
  sort: Sort;
  days: number;
}

export const DEFAULT_QUERY: FeedQuery = Object.freeze({
  q: "", topics: [], journals: [], regions: [], oaOnly: false, preprints: true, sort: "new", days: DEFAULT_DAYS,
}) as FeedQuery;

type Params = URLSearchParams | Record<string, string | string[] | undefined>;

function get(p: Params, key: string): string | undefined {
  if (p instanceof URLSearchParams) return p.getAll(key).join(",") || undefined;
  const v = p[key];
  return Array.isArray(v) ? v.join(",") : v;
}

function slugList(raw: string | undefined): string[] {
  const out = new Set<string>();
  for (const s of (raw ?? "").split(",")) {
    const v = s.trim();
    if (v.length <= MAX_SLUG && SLUG.test(v)) out.add(v);
    if (out.size >= MAX_LIST) break;
  }
  return [...out];
}

function days(raw: string | undefined): number {
  const n = Number(raw);
  if (!raw || !Number.isInteger(n) || n < 1) return DEFAULT_DAYS;
  return Math.min(n, MAX_DAYS);
}

export function parseFeedQuery(p: Params): FeedQuery {
  const q = (get(p, "q") ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_Q).trim();
  const rawSort = get(p, "sort") as Sort | undefined;
  const sort: Sort = rawSort && SORTS.includes(rawSort) && (rawSort !== "relevance" || q) ? rawSort : "new";
  return {
    q, topics: slugList(get(p, "t")), journals: slugList(get(p, "j")), regions: slugList(get(p, "r")),
    oaOnly: get(p, "oa") === "1", preprints: get(p, "pre") !== "0", sort, days: days(get(p, "days")),
  };
}

/** Canonical URL params: defaults omitted, lists sorted, commas left readable. */
export function toSearchParams(q: FeedQuery): URLSearchParams {
  const p = new URLSearchParams();
  if (q.q) p.set("q", q.q);
  const list = (key: string, v: string[]) => { if (v.length) p.set(key, [...v].sort().join(",")); };
  list("t", q.topics);
  list("j", q.journals);
  list("r", q.regions);
  if (q.oaOnly) p.set("oa", "1");
  if (!q.preprints) p.set("pre", "0");
  if (q.sort !== DEFAULT_QUERY.sort) p.set("sort", q.sort);
  if (q.days !== DEFAULT_QUERY.days) p.set("days", String(q.days));
  return p;
}

export function queryString(q: FeedQuery): string {
  return toSearchParams(q).toString().replace(/%2C/g, ",");
}

export function isDefaultQuery(q: FeedQuery): boolean {
  return queryString(q) === "";
}

/** A pasted DOI (bare, doi:, or a doi.org link) in the search box opens that paper instead of searching. */
export function detectDoi(input: string): string | null {
  const t = input.trim();
  return /\s/.test(t) ? null : normalizeDoi(t);
}
