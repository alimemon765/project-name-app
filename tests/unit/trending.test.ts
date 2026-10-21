import { describe, expect, test } from "vitest";
import { trendingScore } from "@/lib/papers/trending";

const NOW = new Date("2026-10-21T12:00:00Z");

describe("trendingScore", () => {
  test("sums current and previous year citations over elapsed months", () => {
    expect(trendingScore({ "2026": 10, "2025": 2, "2024": 50 }, "2025-10-21", NOW)).toBe(1);
  });
  test("ignores years older than the previous year", () => {
    expect(trendingScore({ "2024": 100, "2023": 100 }, "2025-10-21", NOW)).toBe(0);
  });
  test("returns 0 for empty counts", () => {
    expect(trendingScore({}, "2025-10-21", NOW)).toBe(0);
  });
  test("treats future pubDate as 1 month", () => {
    expect(trendingScore({ "2026": 5 }, "2027-01-01", NOW)).toBe(5);
  });
  test("treats brand-new paper (0 whole months) as 1 month", () => {
    expect(trendingScore({ "2026": 4 }, "2026-10-20", NOW)).toBe(4);
  });
  test("counts only whole months elapsed", () => {
    // 2026-08-22 -> 2026-10-21 is 1 whole month
    expect(trendingScore({ "2026": 6 }, "2026-08-22", NOW)).toBe(6);
    // 2026-07-21 -> 3 whole months
    expect(trendingScore({ "2026": 6 }, "2026-07-21", NOW)).toBe(2);
  });
  test("older papers are diluted by age", () => {
    const young = trendingScore({ "2026": 12 }, "2026-04-21", NOW);
    const old = trendingScore({ "2026": 12 }, "2020-04-21", NOW);
    expect(young).toBeGreaterThan(old);
  });
  test("uses the calendar year of now", () => {
    const jan = new Date("2027-01-15T12:00:00Z");
    expect(trendingScore({ "2026": 6, "2025": 100 }, "2026-07-15", jan)).toBe(1);
  });
  test("never returns a negative number", () => {
    expect(trendingScore({ "2026": -5 }, "2025-10-21", NOW)).toBeGreaterThanOrEqual(0);
  });
});
