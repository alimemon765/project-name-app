// Classifier layer 1: transparent keyword rules (editable in the `keywords` table).
import { isMatchableTerm, phrasePattern } from "@/lib/text";

export interface KeywordRule { topicId: number; term: string; weight?: number; kind?: "include" | "exclude" }
export interface Classification { topicIds: number[]; scores: Record<number, number> }

const DEFAULT_THRESHOLD = 0.34;
// Compile each rule's pattern once per rules array (an ingest run reuses one array for ~10k works).
const compiled = new WeakMap<KeywordRule[], { rule: KeywordRule; re: RegExp }[]>();
function compile(rules: KeywordRule[]) {
  let out = compiled.get(rules);
  if (!out) {
    out = rules.filter((r) => r.term && isMatchableTerm(r.term)).map((rule) => ({ rule, re: phrasePattern(rule.term) }));
    compiled.set(rules, out);
  }
  return out;
}
const TITLE_MULTIPLIER = 2;
const SATURATION = 3;

export function classify(input: { title: string; abstract: string | null }, rules: KeywordRule[], opts: { threshold?: number; thresholds?: Record<number, number> } = {}): Classification {
  const title = input.title ?? "";
  const abstract = input.abstract ?? "";
  const raw = new Map<number, number>();
  const excluded = new Set<number>();
  for (const { rule, re } of compile(rules)) {
    const inTitle = re.test(title);
    const inAbstract = !inTitle && re.test(abstract);
    if (!inTitle && !inAbstract) continue;
    if (rule.kind === "exclude") { excluded.add(rule.topicId); continue; }
    const add = (rule.weight ?? 1) * (inTitle ? TITLE_MULTIPLIER : 1);
    raw.set(rule.topicId, (raw.get(rule.topicId) ?? 0) + add);
  }
  const scores: Record<number, number> = {};
  for (const [topicId, value] of raw) {
    if (excluded.has(topicId)) continue;
    const score = Math.round(Math.min(1, value / SATURATION) * 100) / 100;
    if (score >= (opts.thresholds?.[topicId] ?? opts.threshold ?? DEFAULT_THRESHOLD)) scores[topicId] = score;
  }
  const topicIds = Object.keys(scores).map(Number).sort((a, b) => scores[b] - scores[a] || a - b);
  return { topicIds, scores };
}
