// Preprint servers are broad, so a preprint must show stronger evidence than a journal paper:
// a title hit, or several abstract hits for the same topic (score ≥ 2/3 instead of ≥ 0.34).
import { classify, type Classification, type KeywordRule } from "@/lib/classify/keywords";

export const STRICT_THRESHOLD = 0.66;

export function passesStrictGate(input: { title: string; abstract: string | null }, rules: KeywordRule[]): Classification {
  return classify(input, rules, { threshold: STRICT_THRESHOLD });
}
