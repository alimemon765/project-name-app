import { describe, expect, test } from "vitest";
import { EVAL_PLAN, BROAD_JOURNALS, planTotal, broadShare, shuffleOrder } from "@/lib/eval/plan";

describe("eval plan", () => {
  test("draws 200 items", () => {
    expect(planTotal(EVAL_PLAN)).toBe(200);
  });
  test("about 20% come from the broad journals (Sci. Rep., Nat. Commun.)", () => {
    expect(broadShare(EVAL_PLAN)).toBeCloseTo(0.2, 2);
    expect(BROAD_JOURNALS).toEqual(["sci-rep", "nat-commun"]);
  });
  test("includes rejected works so recall can be measured", () => {
    expect(EVAL_PLAN.filter((s) => s.kind === "rejected").reduce((n, s) => n + s.count, 0)).toBeGreaterThanOrEqual(30);
  });
  test("shuffleOrder is a deterministic permutation for a seed", () => {
    const a = shuffleOrder(10, 42);
    expect([...a].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(shuffleOrder(10, 42)).toEqual(a);
    expect(shuffleOrder(10, 43)).not.toEqual(a);
  });
});
