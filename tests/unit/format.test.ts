import { describe, expect, test } from "vitest";
import { formatAuthors, formatCount } from "@/lib/format";

describe("formatAuthors", () => {
  test("returns empty string for no authors", () => {
    expect(formatAuthors([])).toBe("");
  });
  test("returns a single author", () => {
    expect(formatAuthors(["Asha Rao"])).toBe("Asha Rao");
  });
  test("joins up to default max of 3 with ', '", () => {
    expect(formatAuthors(["A", "B", "C"])).toBe("A, B, C");
  });
  test("appends 'and N others' beyond max", () => {
    expect(formatAuthors(["A", "B", "C", "D", "E", "F"])).toBe("A, B, C and 3 others");
  });
  test("uses singular 'other' for exactly one extra", () => {
    expect(formatAuthors(["A", "B", "C", "D"])).toBe("A, B, C and 1 other");
  });
  test("respects custom max", () => {
    expect(formatAuthors(["A", "B", "C"], 1)).toBe("A and 2 others");
    expect(formatAuthors(["A", "B", "C"], 5)).toBe("A, B, C");
  });
  test("does not mutate input", () => {
    const names = ["A", "B", "C", "D"];
    formatAuthors(names);
    expect(names).toEqual(["A", "B", "C", "D"]);
  });
});

describe("formatCount", () => {
  test("zero uses plural", () => {
    expect(formatCount(0, "paper", "papers")).toBe("0 papers");
  });
  test("one uses singular", () => {
    expect(formatCount(1, "paper", "papers")).toBe("1 paper");
  });
  test("two uses plural", () => {
    expect(formatCount(2, "paper", "papers")).toBe("2 papers");
  });
  test("applies thousands separators", () => {
    expect(formatCount(12483, "paper", "papers")).toBe("12,483 papers");
  });
  test("honours locale for number formatting", () => {
    expect(formatCount(12483, "paper", "papers", "de")).toBe("12.483 papers");
  });
  test("handles very large counts", () => {
    expect(formatCount(1234567, "paper", "papers")).toBe("1,234,567 papers");
  });
});
