import { describe, expect, test } from "vitest";
import { parseReferenceLabels } from "@/lib/eval/reference";

const topics = ["flood-risk", "hydrology"];
const regions = ["india", "europe"];
const item = (over: Record<string, unknown> = {}) => ({ source_key: "W1", in_domain: true, topics: ["flood-risk"], regions: ["india"], reason: "Flood model in India", unsure: false, ...over });
const doc = (items: unknown[]) => ({ labeller: "reference", items });

describe("parseReferenceLabels", () => {
  test("accepts a valid file and maps slugs to ids", () => {
    const out = parseReferenceLabels(doc([item()]), { topicIds: { "flood-risk": 9, hydrology: 13 }, regionIds: { india: 13, europe: 8 } });
    expect(out).toEqual([{ sourceKey: "W1", inDomain: true, topicIds: [9], regionIds: [13], reason: "Flood model in India", unsure: false }]);
  });
  test("rejects unknown topic or region slugs, naming the item", () => {
    const ids = { topicIds: Object.fromEntries(topics.map((t, i) => [t, i + 1])), regionIds: Object.fromEntries(regions.map((r, i) => [r, i + 1])) };
    expect(() => parseReferenceLabels(doc([item({ topics: ["storms"] })]), ids)).toThrow(/W1.*storms/);
    expect(() => parseReferenceLabels(doc([item({ regions: ["atlantis"] })]), ids)).toThrow(/W1.*atlantis/);
  });
  test("in-domain items need at least one topic; out-of-domain items carry none", () => {
    const ids = { topicIds: { "flood-risk": 9 }, regionIds: {} };
    expect(() => parseReferenceLabels(doc([item({ topics: [], regions: [] })]), ids)).toThrow(/W1.*topic/);
    expect(() => parseReferenceLabels(doc([item({ in_domain: false, regions: [] })]), ids)).toThrow(/W1.*out of domain/);
  });
  test("requires a reason of at most 300 characters", () => {
    const ids = { topicIds: { "flood-risk": 9 }, regionIds: { india: 13 } };
    expect(() => parseReferenceLabels(doc([item({ reason: "" })]), ids)).toThrow();
    expect(() => parseReferenceLabels(doc([item({ reason: "x".repeat(301) })]), ids)).toThrow();
  });
  test("rejects duplicate source keys", () => {
    const ids = { topicIds: { "flood-risk": 9 }, regionIds: { india: 13 } };
    expect(() => parseReferenceLabels(doc([item(), item()]), ids)).toThrow(/duplicate.*W1/);
  });
});
