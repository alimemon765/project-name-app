// Ali's review of the reference labels: how a verdict becomes a stored label, and the CSV export. Pure.
import { toCsv } from "./plan";

export type Verdict = "correct" | "wrong_topic" | "off_topic" | "skip";
export const VERDICTS: readonly Verdict[] = ["correct", "wrong_topic", "off_topic", "skip"];

export interface StoredLabel { inScope: boolean | null; topicIds: number[] }

/** correct = agree with the reference; wrong_topic = in domain with the picked topics; off_topic = out of domain; skip = no judgement. */
export function verdictToLabel(verdict: Verdict, reference: { inScope: boolean; topicIds: number[] }, picked: number[]): StoredLabel {
  switch (verdict) {
    case "correct": return { inScope: reference.inScope, topicIds: [...reference.topicIds] };
    case "wrong_topic": {
      const topicIds = [...new Set(picked)].sort((a, b) => a - b);
      if (topicIds.length === 0) throw new Error("Wrong topic needs at least one topic picked.");
      return { inScope: true, topicIds };
    }
    case "off_topic": return { inScope: false, topicIds: [] };
    case "skip": return { inScope: null, topicIds: [] };
  }
}

export interface ReviewRow {
  sourceKey: string; stratum: string; venue: string; year: string | null; title: string;
  refInDomain: boolean; refTopics: string[]; refRegions: string[]; refReason: string; refUnsure: boolean;
  verdict: Verdict; aliInDomain: boolean | null; aliTopics: string[]; note: string | null; answeredAt: string;
}

const yesNo = (v: boolean | null) => (v === null ? "" : v ? "yes" : "no");

export function reviewCsv(rows: ReviewRow[]): string {
  return toCsv([
    ["source_key", "stratum", "venue", "year", "title", "my_in_domain", "my_topics", "my_regions", "my_reason", "my_unsure", "verdict", "ali_in_domain", "ali_topics", "note", "answered_at"],
    ...rows.map((r) => [r.sourceKey, r.stratum, r.venue, r.year, r.title, yesNo(r.refInDomain), r.refTopics.join("; "), r.refRegions.join("; "),
      r.refReason, yesNo(r.refUnsure), r.verdict, yesNo(r.aliInDomain), r.aliTopics.join("; "), r.note, r.answeredAt]),
  ]);
}
