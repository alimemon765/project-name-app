import { describe, expect, test } from "vitest";
import { verdictToLabel, reviewCsv, type ReviewRow } from "@/lib/eval/review";

const ref = { inScope: true, topicIds: [9, 13] };

describe("verdictToLabel", () => {
  test("correct copies the reference label", () => {
    expect(verdictToLabel("correct", ref, [])).toEqual({ inScope: true, topicIds: [9, 13] });
    expect(verdictToLabel("correct", { inScope: false, topicIds: [] }, [])).toEqual({ inScope: false, topicIds: [] });
  });
  test("wrong topic means in domain with the picked topics, sorted and de-duplicated", () => {
    expect(verdictToLabel("wrong_topic", ref, [4, 2, 4])).toEqual({ inScope: true, topicIds: [2, 4] });
  });
  test("wrong topic without a picked topic is an error", () => {
    expect(() => verdictToLabel("wrong_topic", ref, [])).toThrow(/topic/);
  });
  test("off-topic means out of domain", () => {
    expect(verdictToLabel("off_topic", ref, [9])).toEqual({ inScope: false, topicIds: [] });
  });
  test("skip records no judgement", () => {
    expect(verdictToLabel("skip", ref, [])).toEqual({ inScope: null, topicIds: [] });
  });
});

describe("reviewCsv", () => {
  const row: ReviewRow = {
    sourceKey: "W1", stratum: "near-miss", venue: "Sci. Rep.", year: "2026", title: 'Lightning, "strokes"',
    refInDomain: true, refTopics: ["Flood risk"], refRegions: ["India"], refReason: "Flood model", refUnsure: true,
    verdict: "off_topic", aliInDomain: false, aliTopics: [], note: "=not ours", answeredAt: "2026-10-23T10:00:00.000Z",
  };
  test("has a header and one quoted, formula-safe row per review", () => {
    const csv = reviewCsv([row]);
    const [header, line] = csv.trimEnd().split("\n");
    expect(header).toBe("source_key,stratum,venue,year,title,my_in_domain,my_topics,my_regions,my_reason,my_unsure,verdict,ali_in_domain,ali_topics,note,answered_at");
    expect(line).toBe('W1,near-miss,Sci. Rep.,2026,"Lightning, ""strokes""",yes,Flood risk,India,Flood model,yes,off_topic,no,,\'=not ours,2026-10-23T10:00:00.000Z');
  });
  test("multiple topics are joined with semicolons; a skip leaves the judgement empty", () => {
    const csv = reviewCsv([{ ...row, refTopics: ["Flood risk", "Hydrology"], verdict: "skip", aliInDomain: null, note: null }]);
    expect(csv).toContain("Flood risk; Hydrology");
    expect(csv.trimEnd().split("\n")[1]).toMatch(/,skip,,,,2026-10-23/);
  });
});
