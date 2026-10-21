import { describe, expect, test } from "vitest";
import { classify } from "@/lib/classify/keywords";

const rule = (topicId: number, term: string, extra: Record<string, unknown> = {}) => ({ topicId, term, ...extra });

describe("classify", () => {
  test("returns empty result when there are no rules", () => {
    expect(classify({ title: "Anything", abstract: null }, [])).toEqual({ topicIds: [], scores: {} });
  });
  test("matches case-insensitively", () => {
    const r = classify({ title: "STORM SURGE", abstract: null }, [rule(1, "storm surge", { weight: 2 })]);
    expect(r.topicIds).toEqual([1]);
  });
  test("title match is doubled: weight 1 in title gives 2/3", () => {
    const r = classify({ title: "Tides", abstract: null }, [rule(1, "tides")]);
    expect(r.scores[1]).toBe(0.67);
  });
  test("abstract-only match uses multiplier 1: 1/3 rounds to 0.33 and is below default threshold", () => {
    const r = classify({ title: "Nothing", abstract: "about tides" }, [rule(1, "tides")]);
    expect(r.topicIds).toEqual([]);
    expect(r.scores).toEqual({});
  });
  test("abstract-only match with weight 2 yields 0.67", () => {
    const r = classify({ title: "x", abstract: "about tides" }, [rule(1, "tides", { weight: 2 })]);
    expect(r.scores[1]).toBe(0.67);
  });
  test("term in both title and abstract counts once with title multiplier", () => {
    const r = classify({ title: "Tides", abstract: "tides everywhere" }, [rule(1, "tides")]);
    expect(r.scores[1]).toBe(0.67);
  });
  test("sums multiple matching rules and caps at 1", () => {
    const r = classify({ title: "Flood and storm", abstract: null }, [
      rule(1, "flood", { weight: 2 }),
      rule(1, "storm", { weight: 2 }),
    ]);
    expect(r.scores[1]).toBe(1);
  });
  test("score is exactly 1 at raw 3", () => {
    const r = classify({ title: "x", abstract: "flood" }, [rule(1, "flood", { weight: 3 })]);
    expect(r.scores[1]).toBe(1);
  });
  test("does not match inside longer words", () => {
    const r = classify({ title: "Tidewater and tides", abstract: "tidewaters" }, [rule(1, "tide", { weight: 3 })]);
    expect(r.topicIds).toEqual([]);
  });
  test("matches word adjacent to punctuation", () => {
    const r = classify({ title: "The tide, rising.", abstract: null }, [rule(1, "tide", { weight: 3 })]);
    expect(r.topicIds).toEqual([1]);
  });
  test("multi-word phrase matches hyphenated form", () => {
    const r = classify({ title: "Sea-level rise", abstract: null }, [rule(1, "sea level", { weight: 3 })]);
    expect(r.topicIds).toEqual([1]);
  });
  test("multi-word phrase matches whitespace form", () => {
    const r = classify({ title: "Sea level rise", abstract: null }, [rule(1, "sea level", { weight: 3 })]);
    expect(r.topicIds).toEqual([1]);
  });
  test("exclude rule removes the topic", () => {
    const r = classify({ title: "Flood prediction in finance", abstract: null }, [
      rule(1, "flood", { weight: 3 }),
      rule(1, "finance", { kind: "exclude" }),
    ]);
    expect(r.topicIds).toEqual([]);
    expect(r.scores).toEqual({});
  });
  test("exclude in abstract also removes the topic", () => {
    const r = classify({ title: "Flood", abstract: "a finance paper" }, [
      rule(1, "flood", { weight: 3 }),
      rule(1, "finance", { kind: "exclude" }),
    ]);
    expect(r.topicIds).toEqual([]);
  });
  test("exclude only affects its own topic", () => {
    const r = classify({ title: "Flood finance", abstract: null }, [
      rule(1, "flood", { weight: 3 }),
      rule(2, "flood", { weight: 3 }),
      rule(2, "finance", { kind: "exclude" }),
    ]);
    expect(r.topicIds).toEqual([1]);
  });
  test("exclude rules do not add score", () => {
    const r = classify({ title: "Flood", abstract: null }, [rule(1, "flood", { weight: 1 }), rule(1, "nomatch", { kind: "exclude" })]);
    expect(r.scores[1]).toBe(0.67);
  });
  test("orders by score desc then id asc", () => {
    const r = classify({ title: "alpha beta gamma delta", abstract: null }, [
      rule(5, "alpha", { weight: 1.5 }),
      rule(2, "beta", { weight: 1.5 }),
      rule(9, "gamma", { weight: 0.8 }),
      rule(3, "delta", { weight: 0.6 }),
    ]);
    expect(r.scores).toEqual({ 2: 1, 5: 1, 9: 0.53, 3: 0.4 });
    expect(r.topicIds).toEqual([2, 5, 9, 3]);
  });
  test("scores contain only assigned topics", () => {
    const r = classify({ title: "alpha", abstract: "beta" }, [rule(1, "alpha"), rule(2, "beta")]);
    expect(Object.keys(r.scores)).toEqual(["1"]);
  });
  test("respects custom global threshold", () => {
    const r = classify({ title: "x", abstract: "tides" }, [rule(1, "tides")], { threshold: 0.3 });
    expect(r.topicIds).toEqual([1]);
    expect(r.scores[1]).toBe(0.33);
  });
  test("per-topic threshold overrides global threshold", () => {
    const rules = [rule(1, "tides", { weight: 2 }), rule(2, "tides", { weight: 2 })];
    const r = classify({ title: "x", abstract: "tides" }, rules, { threshold: 0.9, thresholds: { 1: 0.5 } });
    expect(r.topicIds).toEqual([1]);
  });
  test("score equal to threshold is assigned", () => {
    const r = classify({ title: "x", abstract: "tides" }, [rule(1, "tides", { weight: 1.5 })], { threshold: 0.5 });
    expect(r.topicIds).toEqual([1]);
  });
  test("handles null abstract", () => {
    expect(() => classify({ title: "Tides", abstract: null }, [rule(1, "tides")])).not.toThrow();
  });
  test("handles empty title and abstract", () => {
    expect(classify({ title: "", abstract: "" }, [rule(1, "tides")])).toEqual({ topicIds: [], scores: {} });
  });
  test("escapes regex special characters in terms", () => {
    const r = classify({ title: "C++ models", abstract: null }, [rule(1, "c++", { weight: 3 }), rule(2, ".*", { weight: 3 })]);
    expect(r.topicIds).not.toContain(2);
  });
  test("inputs are not mutated", () => {
    const rules = [rule(1, "tides", { weight: 3 })];
    const snapshot = JSON.stringify(rules);
    classify({ title: "tides", abstract: null }, rules);
    expect(JSON.stringify(rules)).toBe(snapshot);
  });
});
