// The classifier eval set (C2, Ali's brief 2026-10-23, D043): 200 works drawn by stratum.
// 20% from the two broad journals, 10% preprints, 10% keyword-trap near-misses, 30 rejected works (for recall),
// and the rest stratified by primary topic, journal and month. Pure: the builder (workers/build-eval-set.ts) runs it.

export const PLAN_VERSION = 2;
export const BROAD_JOURNALS = ["sci-rep", "nat-commun"] as const;

export interface Stratum {
  name: string;
  kind: "classified" | "rejected" | "near_miss";
  source: "journal" | "preprint";
  journals?: "broad" | "core" | "any";
  server?: "arxiv" | "essoar" | "eartharxiv" | "ssrn";
  byTopic?: boolean;                    // stratify across the 13 primary topics
  count: number;
}

export const EVAL_PLAN: Stratum[] = [
  { name: "broad:classified", kind: "classified", source: "journal", journals: "broad", count: 30 },
  { name: "broad:rejected", kind: "rejected", source: "journal", journals: "broad", count: 10 },
  { name: "preprint:arxiv", kind: "classified", source: "preprint", server: "arxiv", count: 5 },
  { name: "preprint:essoar", kind: "classified", source: "preprint", server: "essoar", count: 5 },
  { name: "preprint:eartharxiv", kind: "classified", source: "preprint", server: "eartharxiv", count: 5 },
  { name: "preprint:ssrn", kind: "classified", source: "preprint", server: "ssrn", count: 5 },
  { name: "near-miss", kind: "near_miss", source: "journal", journals: "any", count: 20 },
  { name: "core:classified", kind: "classified", source: "journal", journals: "core", byTopic: true, count: 100 },
  { name: "core:rejected", kind: "rejected", source: "journal", journals: "core", count: 20 },
];

/** Keyword traps: papers that match our include terms but are probably about something else (Postgres `~*` patterns). */
export const NEAR_MISS_TRAPS: { name: string; pattern: string }[] = [
  { name: "lightning", pattern: "\\mlightning\\M" },
  { name: "microplastics", pattern: "\\mmicroplastic" },
  { name: "seismic waves", pattern: "\\mseismic" },
  { name: "plasma waves", pattern: "\\m(plasma|ionospher|magnetospher)" },
  { name: "financial flooding", pattern: "\\m(financial|bank(s|ing)?|monetary|stock market|investor)\\M" },
  { name: "mathematical deltas", pattern: "\\m(dirac delta|delta function|delta method|kronecker)\\M" },
];
export const NEAR_MISS_PER_TRAP_MAX = 4;
export const CORE_PER_JOURNAL_MAX = 3;

export const planTotal = (plan: Stratum[]) => plan.reduce((n, s) => n + s.count, 0);
export const broadShare = (plan: Stratum[]) => plan.filter((s) => s.journals === "broad").reduce((n, s) => n + s.count, 0) / planTotal(plan);

/** Deterministic Fisher–Yates over 0..n-1 (mulberry32), so every draw is reproducible from the seed. */
export function shuffleOrder(n: number, seed: number): number[] {
  let t = seed >>> 0;
  const rand = () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** Ali's review queue: every item the reference pass marked unsure, then a seeded random fill up to `size`. */
export function pickReviewQueue(keys: readonly string[], unsureKeys: readonly string[], size: number, seed: number): string[] {
  const inSet = new Set(keys);
  const unsure = [...new Set(unsureKeys)].filter((k) => inSet.has(k));
  const rest = keys.filter((k) => !unsure.includes(k));
  const fill = shuffleOrder(rest.length, seed).map((i) => rest[i]).slice(0, Math.max(0, size - unsure.length));
  return [...unsure, ...fill];
}

type Cell = string | number | boolean | null | undefined;

/** RFC 4180 CSV; cells starting with = + - @ get a leading apostrophe so spreadsheets don't run them as formulas. */
export function toCsv(rows: Cell[][]): string {
  const cell = (v: Cell) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}
