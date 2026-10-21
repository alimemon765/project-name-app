import { describe, expect, test } from "vitest";
import { monthWindows, planBatches } from "@/lib/ingest/backfill";

describe("monthWindows", () => {
  test("returns calendar months newest first, the current month ending today", () => {
    // Arrange
    const today = new Date("2026-10-21T12:00:00Z");
    // Act
    const w = monthWindows(today, 3);
    // Assert
    expect(w).toEqual([
      { key: "2026-10", from: "2026-10-01", to: "2026-10-21" },
      { key: "2026-09", from: "2026-09-01", to: "2026-09-30" },
      { key: "2026-08", from: "2026-08-01", to: "2026-08-31" },
    ]);
  });
  test("crosses a year boundary and handles February in a leap year", () => {
    const w = monthWindows(new Date("2024-03-05T00:00:00Z"), 4);
    expect(w.map((x) => x.key)).toEqual(["2024-03", "2024-02", "2024-01", "2023-12"]);
    expect(w[1]).toEqual({ key: "2024-02", from: "2024-02-01", to: "2024-02-29" });
  });
  test("24 months gives 24 distinct windows", () => {
    expect(new Set(monthWindows(new Date("2026-10-21T00:00:00Z"), 24).map((x) => x.key)).size).toBe(24);
  });
  test("rejects a non-positive month count", () => {
    expect(() => monthWindows(new Date(), 0)).toThrow();
  });
});

describe("planBatches", () => {
  const j = (id: string, perYear: number) => ({ openalexId: id, perYear });

  test("packs small journals together up to the volume cap", () => {
    const b = planBatches([j("S1", 100), j("S2", 200), j("S3", 300)], { maxPerYear: 1000, maxSources: 50 });
    expect(b).toEqual([["S3", "S2", "S1"]]);   // largest first
  });
  test("a journal above the cap gets a batch of its own", () => {
    const b = planBatches([j("BIG", 52000), j("S1", 100), j("S2", 100)], { maxPerYear: 40000, maxSources: 50 });
    expect(b).toContainEqual(["BIG"]);
    expect(b.flat().sort()).toEqual(["BIG", "S1", "S2"]);
  });
  test("never exceeds maxSources per batch", () => {
    const many = Array.from({ length: 120 }, (_, i) => j(`S${i}`, 1));
    const b = planBatches(many, { maxPerYear: 1e9, maxSources: 50 });
    expect(Math.max(...b.map((x) => x.length))).toBeLessThanOrEqual(50);
    expect(b.flat()).toHaveLength(120);
  });
  test("every journal appears exactly once", () => {
    const list = [j("A", 30000), j("B", 20000), j("C", 15000), j("D", 9000), j("E", 1)];
    const b = planBatches(list, { maxPerYear: 35000, maxSources: 50 });
    expect(b.flat().sort()).toEqual(["A", "B", "C", "D", "E"]);
    for (const batch of b) {
      const vol = batch.reduce((s, id) => s + list.find((x) => x.openalexId === id)!.perYear, 0);
      expect(batch.length === 1 || vol <= 35000).toBe(true);
    }
  });
  test("treats a missing volume as zero and does not mutate the input", () => {
    const list = Object.freeze([Object.freeze({ openalexId: "S1", perYear: Number.NaN }), Object.freeze(j("S2", 5))]);
    expect(planBatches(list, { maxPerYear: 10, maxSources: 50 })).toEqual([["S2", "S1"]]);
  });
});
