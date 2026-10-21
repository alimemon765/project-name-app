import { describe, expect, test } from "vitest";
import { rebuildAbstract } from "@/lib/papers/abstract";

describe("rebuildAbstract", () => {
  test("orders words by position", () => {
    expect(rebuildAbstract({ matter: [2], Floods: [0], do: [1] })).toBe("Floods do matter");
  });
  test("repeats words that appear at multiple positions", () => {
    expect(rebuildAbstract({ the: [0, 3], sea: [1], and: [2], coast: [4] })).toBe("the sea and the coast");
  });
  test("returns null for null, undefined and empty object", () => {
    expect(rebuildAbstract(null)).toBeNull();
    expect(rebuildAbstract(undefined)).toBeNull();
    expect(rebuildAbstract({})).toBeNull();
  });
  test("strips leading 'Abstract.' label", () => {
    expect(rebuildAbstract({ "Abstract.": [0], Floods: [1], matter: [2] })).toBe("Floods matter");
  });
  test("strips leading 'Abstract:' label", () => {
    expect(rebuildAbstract({ "Abstract:": [0], Floods: [1], matter: [2] })).toBe("Floods matter");
  });
  test("strips leading label case-insensitively", () => {
    expect(rebuildAbstract({ SUMMARY: [0], Floods: [1], matter: [2] })).toBe("Floods matter");
    expect(rebuildAbstract({ "summary:": [0], Floods: [1] })).toBe("Floods");
  });
  test("strips bare 'Abstract' label without punctuation", () => {
    expect(rebuildAbstract({ Abstract: [0], Floods: [1] })).toBe("Floods");
  });
  test("does not strip label that appears mid-text", () => {
    expect(rebuildAbstract({ Floods: [0], summary: [1], matter: [2] })).toBe("Floods summary matter");
  });
  test("does not strip words that merely start with the label", () => {
    expect(rebuildAbstract({ Abstraction: [0], matters: [1] })).toBe("Abstraction matters");
  });
  test("collapses extra whitespace", () => {
    expect(rebuildAbstract({ " Floods ": [0], "matter\n": [1], "  now": [2] })).toBe("Floods matter now");
  });
  test("handles gaps in positions by ordering only", () => {
    expect(rebuildAbstract({ a: [0], b: [5], c: [10] })).toBe("a b c");
  });
  test("returns null when only a label remains", () => {
    expect(rebuildAbstract({ "Abstract.": [0] })).toBeNull();
  });
  test("handles large abstracts", () => {
    const inv: Record<string, number[]> = {};
    for (let i = 0; i < 10000; i++) inv[`w${i}`] = [i];
    const out = rebuildAbstract(inv);
    expect(out?.split(" ")).toHaveLength(10000);
    expect(out?.startsWith("w0 w1 w2")).toBe(true);
  });
  test("preserves unicode", () => {
    expect(rebuildAbstract({ "Ganges–Brahmaputra": [0], "delta 🌊": [1] })).toBe("Ganges–Brahmaputra delta 🌊");
  });
});
