import { describe, expect, test } from "vitest";
import { tagRegions } from "@/lib/regions/gazetteer";

const regions = [
  { id: 1, parentId: null, aliases: ["Asia"] },
  { id: 2, parentId: 1, aliases: ["India"] },
  { id: 3, parentId: 2, aliases: ["Mumbai", "Bombay"] },
  { id: 4, parentId: 1, aliases: ["Bay of Bengal"] },
  { id: 5, parentId: 1, aliases: ["Ganges-Brahmaputra"] },
  { id: 6, parentId: null, aliases: ["Europe"] },
];

describe("tagRegions", () => {
  test("returns [] for empty text", () => {
    expect(tagRegions("", regions)).toEqual([]);
  });
  test("returns [] when no regions given", () => {
    expect(tagRegions("Mumbai floods", [])).toEqual([]);
  });
  test("returns [] when nothing matches", () => {
    expect(tagRegions("Rivers of Brazil", regions)).toEqual([]);
  });
  test("matches case-insensitively", () => {
    expect(tagRegions("MUMBAI flooding", [regions[2]])).toEqual([3]);
  });
  test("includes ancestors in sorted order", () => {
    expect(tagRegions("Flooding in Mumbai", regions)).toEqual([1, 2, 3]);
  });
  test("matches secondary aliases", () => {
    expect(tagRegions("Old Bombay maps", regions)).toEqual([1, 2, 3]);
  });
  test("matches multi-word aliases", () => {
    expect(tagRegions("Cyclones in the Bay of Bengal", regions)).toEqual([1, 4]);
  });
  test("hyphenated alias matches en dash text", () => {
    expect(tagRegions("The Ganges–Brahmaputra delta", regions)).toEqual([1, 5]);
  });
  test("hyphenated alias matches plain hyphen text", () => {
    expect(tagRegions("The Ganges-Brahmaputra delta", regions)).toEqual([1, 5]);
  });
  test("does not match alias inside a longer word", () => {
    expect(tagRegions("A Mumbaikar's story", regions)).toEqual([]);
  });
  test("does not match alias as a suffix of a longer word", () => {
    expect(tagRegions("Neomumbai", regions)).toEqual([]);
  });
  test("matches alias next to punctuation", () => {
    expect(tagRegions("(Mumbai), India.", regions)).toEqual([1, 2, 3]);
  });
  test("returns unique ids when several matches share ancestors", () => {
    expect(tagRegions("Mumbai and India and Asia and Bombay", regions)).toEqual([1, 2, 3]);
  });
  test("returns ids from separate trees sorted ascending", () => {
    expect(tagRegions("Europe and Mumbai", regions)).toEqual([1, 2, 3, 6]);
  });
  test("terminates on cyclic parent chain", () => {
    const cyc = [
      { id: 1, parentId: 2, aliases: ["Alpha"] },
      { id: 2, parentId: 1, aliases: ["Beta"] },
    ];
    expect(tagRegions("Alpha", cyc)).toEqual([1, 2]);
  });
  test("handles dangling parent id", () => {
    expect(tagRegions("Alpha", [{ id: 1, parentId: 99, aliases: ["Alpha"] }])).toEqual([1]);
  });
  test("escapes regex special characters in aliases", () => {
    expect(tagRegions("Anywhere", [{ id: 1, parentId: null, aliases: [".*"] }])).toEqual([]);
  });
  test("handles region with no aliases", () => {
    expect(tagRegions("Anything", [{ id: 1, parentId: null, aliases: [] }])).toEqual([]);
  });
});
