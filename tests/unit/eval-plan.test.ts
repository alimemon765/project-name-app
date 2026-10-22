import { describe, expect, test } from "vitest";
import { EVAL_PLAN, BROAD_JOURNALS, NEAR_MISS_TRAPS, planTotal, broadShare, shuffleOrder, pickReviewQueue, toCsv } from "@/lib/eval/plan";

const share = (pred: (s: (typeof EVAL_PLAN)[number]) => boolean) => EVAL_PLAN.filter(pred).reduce((n, s) => n + s.count, 0) / planTotal(EVAL_PLAN);

describe("eval plan v2 (Ali's brief, D043)", () => {
  test("draws 200 items", () => expect(planTotal(EVAL_PLAN)).toBe(200));
  test("about 20% from the broad journals", () => {
    expect(broadShare(EVAL_PLAN)).toBeCloseTo(0.2, 2);
    expect(BROAD_JOURNALS).toEqual(["sci-rep", "nat-commun"]);
  });
  test("about 10% preprints and 10% near-misses", () => {
    expect(share((s) => s.source === "preprint")).toBeCloseTo(0.1, 2);
    expect(share((s) => s.kind === "near_miss")).toBeCloseTo(0.1, 2);
  });
  test("30 rejected works so recall is measurable", () => {
    expect(EVAL_PLAN.filter((s) => s.kind === "rejected").reduce((n, s) => n + s.count, 0)).toBe(30);
  });
  test("near-miss traps cover the brief's examples, each with a postgres regex", () => {
    expect(NEAR_MISS_TRAPS.map((t) => t.name)).toEqual(["lightning", "microplastics", "seismic waves", "plasma waves", "financial flooding", "mathematical deltas"]);
    for (const t of NEAR_MISS_TRAPS) expect(() => new RegExp(t.pattern, "i")).not.toThrow();
  });
  test("shuffleOrder is a deterministic permutation for a seed", () => {
    const a = shuffleOrder(10, 42);
    expect([...a].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(shuffleOrder(10, 42)).toEqual(a);
    expect(shuffleOrder(10, 43)).not.toEqual(a);
  });
});

describe("pickReviewQueue", () => {
  const keys = Array.from({ length: 200 }, (_, i) => `k${i}`);
  test("takes every unsure item and fills to 50 with a seeded random pick", () => {
    const unsure = ["k3", "k77", "k150"];
    const q = pickReviewQueue(keys, unsure, 50, 7);
    expect(q).toHaveLength(50);
    expect(new Set(q).size).toBe(50);
    for (const u of unsure) expect(q).toContain(u);
    expect(pickReviewQueue(keys, unsure, 50, 7)).toEqual(q);
  });
  test("keeps all unsure items even when there are more than the queue size", () => {
    const unsure = keys.slice(0, 60);
    expect(pickReviewQueue(keys, unsure, 50, 7)).toHaveLength(60);
  });
  test("ignores unsure keys that are not in the set", () => {
    expect(pickReviewQueue(keys.slice(0, 10), ["nope"], 5, 1)).not.toContain("nope");
  });
});

describe("toCsv", () => {
  test("quotes fields with commas, quotes or newlines, and doubles inner quotes", () => {
    expect(toCsv([["a", "b"], ["x,y", 'say "hi"'], ["line1\nline2", 3]])).toBe('a,b\n"x,y","say ""hi"""\n"line1\nline2",3\n');
  });
  test("neutralises spreadsheet formulas", () => {
    expect(toCsv([["=SUM(A1)", "+1", "-2", "@x"]])).toBe("'=SUM(A1),'+1,'-2,'@x\n");
  });
  test("empty and null cells stay empty", () => {
    expect(toCsv([[null, undefined, ""]])).toBe(",,\n");
  });
});

describe("toCsv formula safety (code review)", () => {
  test("leading tab and carriage return are neutralised too", () => {
    expect(toCsv([["\t=cmd", "\r=cmd"]])).toBe('\'\t=cmd,"\'\r=cmd"\n');
  });
});
