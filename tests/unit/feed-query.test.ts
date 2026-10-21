import { describe, expect, test } from "vitest";
import { DEFAULT_QUERY, detectDoi, isDefaultQuery, parseFeedQuery, queryString, toSearchParams, type FeedQuery } from "@/lib/feed/query";

const sp = (s: string) => new URLSearchParams(s);

describe("parseFeedQuery", () => {
  test("empty params give the default query", () => {
    expect(parseFeedQuery(sp(""))).toEqual(DEFAULT_QUERY);
    expect(DEFAULT_QUERY).toMatchObject({ q: "", topics: [], journals: [], regions: [], oaOnly: false, preprints: true, sort: "new", days: 30 });
  });
  test("reads every field", () => {
    const q = parseFeedQuery(sp("q=storm%20surge&t=flood-risk,subsidence&j=nhess&r=mumbai&oa=1&pre=0&sort=cited&days=14"));
    expect(q).toEqual({ q: "storm surge", topics: ["flood-risk", "subsidence"], journals: ["nhess"], regions: ["mumbai"],
      oaOnly: true, preprints: false, sort: "cited", days: 14 });
  });
  test("drops malformed slugs, de-duplicates and caps list length", () => {
    const many = Array.from({ length: 80 }, (_, i) => `j${i}`).join(",");
    const q = parseFeedQuery(sp(`t=flood-risk,FLOOD RISK,flood-risk,<script>&j=${many}`));
    expect(q.topics).toEqual(["flood-risk"]);
    expect(q.journals).toHaveLength(50);
  });
  test("unknown sort and out-of-range days fall back or clamp", () => {
    expect(parseFeedQuery(sp("sort=random")).sort).toBe("new");
    expect(parseFeedQuery(sp("days=0")).days).toBe(30);
    expect(parseFeedQuery(sp("days=abc")).days).toBe(30);
    expect(parseFeedQuery(sp("days=365")).days).toBe(90);
    expect(parseFeedQuery(sp("days=7")).days).toBe(7);
  });
  test("relevance sort is only valid with a search query", () => {
    expect(parseFeedQuery(sp("sort=relevance")).sort).toBe("new");
    expect(parseFeedQuery(sp("q=surge&sort=relevance")).sort).toBe("relevance");
  });
  test("trims and caps the search text", () => {
    expect(parseFeedQuery(sp(`q=${"  a".repeat(200)}`)).q.length).toBeLessThanOrEqual(200);
    expect(parseFeedQuery(sp("q=%20%20surge%20%20")).q).toBe("surge");
  });
  test("accepts a plain object too (Next.js searchParams)", () => {
    expect(parseFeedQuery({ t: "hydrology", oa: "1" })).toMatchObject({ topics: ["hydrology"], oaOnly: true });
    expect(parseFeedQuery({ t: ["hydrology", "subsidence"] })).toMatchObject({ topics: ["hydrology", "subsidence"] });
  });
});

describe("toSearchParams", () => {
  test("omits defaults so the plain feed has a clean URL", () => {
    expect(toSearchParams(DEFAULT_QUERY).toString()).toBe("");
  });
  test("round-trips through parseFeedQuery", () => {
    const q: FeedQuery = { q: "sea level", topics: ["subsidence", "flood-risk"], journals: ["nhess"], regions: ["india"],
      oaOnly: true, preprints: false, sort: "trending", days: 7 };
    expect(parseFeedQuery(toSearchParams(q))).toEqual({ ...q, topics: ["flood-risk", "subsidence"] });
  });
  test("is canonical: list order does not change the URL", () => {
    const a = toSearchParams({ ...DEFAULT_QUERY, topics: ["b", "a"] }).toString();
    const b = toSearchParams({ ...DEFAULT_QUERY, topics: ["a", "b"] }).toString();
    expect(a).toBe(b);
  });
  test("queryString keeps commas readable", () => {
    expect(queryString({ ...DEFAULT_QUERY, topics: ["b", "a"], journals: ["nhess"] })).toBe("t=a,b&j=nhess");
  });
});

describe("isDefaultQuery", () => {
  test("true only when nothing narrows the feed", () => {
    expect(isDefaultQuery(DEFAULT_QUERY)).toBe(true);
    expect(isDefaultQuery({ ...DEFAULT_QUERY, oaOnly: true })).toBe(false);
    expect(isDefaultQuery({ ...DEFAULT_QUERY, q: "x" })).toBe(false);
  });
});

describe("detectDoi", () => {
  test.each([
    ["10.5194/nhess-26-5119-2026", "10.5194/nhess-26-5119-2026"],
    ["https://doi.org/10.1029/2026GL000001", "10.1029/2026gl000001"],
    ["  doi:10.1016/j.coastaleng.2026.104512 ", "10.1016/j.coastaleng.2026.104512"],
  ])("recognises %s", (input, doi) => {
    expect(detectDoi(input)).toBe(doi);
  });
  test.each(["storm surge 10.5 m", "10.5", "flood risk", ""])("ignores %s", (input) => {
    expect(detectDoi(input)).toBeNull();
  });
});
