// The classifier eval set (step 2, C2): 200 works drawn by stratum. About 20% from the two broad journals, whose
// noise dominates the feed, and 50 works the classifier rejected so recall can be measured.

export const BROAD_JOURNALS = ["sci-rep", "nat-commun"] as const;

export interface Stratum {
  name: string;
  kind: "classified" | "rejected";
  source: "journal" | "preprint";
  journals?: "broad" | "core";          // journal strata: the two broad journals, or every other journal
  server?: "arxiv" | "essoar" | "eartharxiv" | "ssrn";
  count: number;
}

export const EVAL_PLAN: Stratum[] = [
  { name: "journal:broad", kind: "classified", source: "journal", journals: "broad", count: 30 },
  { name: "journal:core", kind: "classified", source: "journal", journals: "core", count: 80 },
  { name: "preprint:ssrn", kind: "classified", source: "preprint", server: "ssrn", count: 15 },
  { name: "preprint:essoar", kind: "classified", source: "preprint", server: "essoar", count: 10 },
  { name: "preprint:eartharxiv", kind: "classified", source: "preprint", server: "eartharxiv", count: 10 },
  { name: "preprint:arxiv", kind: "classified", source: "preprint", server: "arxiv", count: 5 },
  { name: "rejected:broad", kind: "rejected", source: "journal", journals: "broad", count: 10 },
  { name: "rejected:core", kind: "rejected", source: "journal", journals: "core", count: 40 },
];

export const planTotal = (plan: Stratum[]) => plan.reduce((n, s) => n + s.count, 0);
export const broadShare = (plan: Stratum[]) => plan.filter((s) => s.journals === "broad").reduce((n, s) => n + s.count, 0) / planTotal(plan);

/** Deterministic Fisher–Yates over 0..n-1 (mulberry32), so the review order is reproducible from the seed. */
export function shuffleOrder(n: number, seed: number): number[] {
  let t = seed >>> 0;
  const rand = () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const out = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
