import { beforeEach, describe, expect, test } from "vitest";
import fixture from "./fixtures/openalex-work.json";
import { mapWork } from "@/lib/openalex/map";
import { trendingScore } from "@/lib/papers/trending";
import { formatAuthors } from "@/lib/format";

const NOW = new Date("2026-10-21T12:00:00Z");
const JOURNAL = "journal-uuid-1";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let work: any;
beforeEach(() => {
  work = structuredClone(fixture);
});

describe("mapWork", () => {
  test("maps the full fixture", () => {
    const row = mapWork(work, JOURNAL, NOW);
    expect(row).toMatchObject({
      openalexId: "W4415000001",
      doi: "10.5194/nhess-26-5119-2026",
      title: "Hydrologically enhanced machine learning framework for urban flood inundation mapping: a case study of Mumbai, India",
      abstract: "Urban floods are increasing",
      authors: ["Asha Rao", "Vikram Shah", "Meera Iyer"],
      authorCount: 3,
      journalId: JOURNAL,
      pubDate: "2026-10-20",
      isOa: true,
      oaUrl: "https://nhess.copernicus.org/articles/26/5119/2026/",
      licence: "cc-by",
      citedByCount: 4,
      citationsByYear: { "2026": 4 },
      isPreprint: false,
    });
  });
  test("authorsDisplay uses formatAuthors", () => {
    const row = mapWork(work, JOURNAL, NOW);
    expect(row?.authorsDisplay).toBe(formatAuthors(["Asha Rao", "Vikram Shah", "Meera Iyer"]));
  });
  test("trendingScore uses trendingScore()", () => {
    const row = mapWork(work, JOURNAL, NOW);
    expect(row?.trendingScore).toBe(trendingScore({ "2026": 4 }, "2026-10-20", NOW));
  });
  test("strips HTML tags from the title", () => {
    work.title = "A <b>bold</b> and <sub>sub</sub> title";
    expect(mapWork(work, JOURNAL, NOW)?.title).toBe("A bold and sub title");
  });
  test("isPreprint is true for type preprint", () => {
    work.type = "preprint";
    expect(mapWork(work, JOURNAL, NOW)?.isPreprint).toBe(true);
  });
  test("isPreprint is false for other types", () => {
    work.type = "review";
    expect(mapWork(work, JOURNAL, NOW)?.isPreprint).toBe(false);
  });
  test("returns null when title is missing", () => {
    delete work.title;
    expect(mapWork(work, JOURNAL, NOW)).toBeNull();
  });
  test("returns null when title is null, empty or whitespace", () => {
    for (const t of [null, "", "   ", "<i></i>"]) {
      work.title = t;
      expect(mapWork(work, JOURNAL, NOW)).toBeNull();
    }
  });
  test("returns null when input is not an object", () => {
    for (const v of [null, undefined, 42, "str", true, []]) {
      expect(mapWork(v, JOURNAL, NOW)).toBeNull();
    }
  });
  test("invalid DOI gives doi null but row is still returned", () => {
    work.doi = "not a doi";
    const row = mapWork(work, JOURNAL, NOW);
    expect(row).not.toBeNull();
    expect(row?.doi).toBeNull();
  });
  test("missing optional fields produce nulls and defaults without throwing", () => {
    const minimal = { id: "https://openalex.org/W1", title: "Only a title" };
    let row: ReturnType<typeof mapWork> = null;
    expect(() => {
      row = mapWork(minimal, JOURNAL, NOW);
    }).not.toThrow();
    expect(row).toMatchObject({
      openalexId: "W1",
      doi: null,
      title: "Only a title",
      abstract: null,
      authors: [],
      authorCount: 0,
      authorsDisplay: "",
      isOa: false,
      oaUrl: null,
      licence: null,
      citedByCount: 0,
      citationsByYear: {},
      trendingScore: 0,
      isPreprint: false,
    });
  });
  test("handles null nested objects", () => {
    work.open_access = null;
    work.best_oa_location = null;
    work.authorships = null;
    work.counts_by_year = null;
    work.abstract_inverted_index = null;
    const row = mapWork(work, JOURNAL, NOW);
    expect(row).toMatchObject({ isOa: false, oaUrl: null, licence: null, authors: [], citationsByYear: {}, abstract: null });
  });
  test("skips authorships without a display name", () => {
    work.authorships.push({ author: {} }, {});
    const row = mapWork(work, JOURNAL, NOW);
    expect(row?.authors).toEqual(["Asha Rao", "Vikram Shah", "Meera Iyer"]);
  });
  test("collapses multiple counts_by_year entries into a string-keyed map", () => {
    work.counts_by_year = [
      { year: 2026, cited_by_count: 4 },
      { year: 2025, cited_by_count: 9 },
    ];
    expect(mapWork(work, JOURNAL, NOW)?.citationsByYear).toEqual({ "2026": 4, "2025": 9 });
  });
  test("does not mutate the input work", () => {
    const before = JSON.stringify(work);
    mapWork(work, JOURNAL, NOW);
    expect(JSON.stringify(work)).toBe(before);
  });
});
