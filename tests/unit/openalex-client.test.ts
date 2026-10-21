import { describe, expect, test } from "vitest";
import { buildWorksUrl, parseSpend } from "@/lib/openalex/client";

describe("parseSpend", () => {
  test("parses both headers", () => {
    const h = new Headers({ "x-ratelimit-cost-usd": "0.0005", "x-ratelimit-remaining-usd": "9.99" });
    expect(parseSpend(h)).toEqual({ costUsd: 0.0005, remainingUsd: 9.99, limitUsd: null });
  });
  test("returns nulls when headers are missing", () => {
    expect(parseSpend(new Headers())).toEqual({ costUsd: null, remainingUsd: null, limitUsd: null });
  });
  test("returns null for non-numeric values", () => {
    const h = new Headers({ "x-ratelimit-cost-usd": "abc", "x-ratelimit-remaining-usd": "" });
    expect(parseSpend(h)).toEqual({ costUsd: null, remainingUsd: null, limitUsd: null });
  });
  test("parses one header while the other is missing", () => {
    expect(parseSpend(new Headers({ "x-ratelimit-remaining-usd": "3" }))).toEqual({ costUsd: null, remainingUsd: 3, limitUsd: null });
  });
  test("parses zero", () => {
    expect(parseSpend(new Headers({ "x-ratelimit-cost-usd": "0" })).costUsd).toBe(0);
  });
  test("returns null for Infinity/NaN strings", () => {
    const h = new Headers({ "x-ratelimit-cost-usd": "Infinity", "x-ratelimit-remaining-usd": "NaN" });
    expect(parseSpend(h)).toEqual({ costUsd: null, remainingUsd: null, limitUsd: null });
  });
});

const base = { sourceIds: ["S1", "S2"], fromPublicationDate: "2026-10-01" };
const parse = (u: string) => new URL(u);

describe("buildWorksUrl", () => {
  test("uses the OpenAlex works endpoint", () => {
    const u = parse(buildWorksUrl(base));
    expect(u.origin + u.pathname).toBe("https://api.openalex.org/works");
  });
  test("builds the filter param", () => {
    expect(parse(buildWorksUrl(base)).searchParams.get("filter")).toBe(
      "primary_location.source.id:S1|S2,from_publication_date:2026-10-01",
    );
  });
  test("single source id has no pipe", () => {
    const u = parse(buildWorksUrl({ ...base, sourceIds: ["S9"] }));
    expect(u.searchParams.get("filter")).toBe("primary_location.source.id:S9,from_publication_date:2026-10-01");
  });
  test("defaults per_page to 100 and cursor to *", () => {
    const u = parse(buildWorksUrl(base));
    expect(u.searchParams.get("per_page")).toBe("100");
    expect(u.searchParams.get("cursor")).toBe("*");
  });
  test("clamps per_page to 100", () => {
    expect(parse(buildWorksUrl({ ...base, perPage: 500 })).searchParams.get("per_page")).toBe("100");
  });
  test("keeps per_page below the max", () => {
    expect(parse(buildWorksUrl({ ...base, perPage: 25 })).searchParams.get("per_page")).toBe("25");
  });
  // OpenAlex's from_created_date / from_updated_date are paid "daily sync" filters (verified 2026-10-21, HTTP 429
  // "Plan upgrade required"); ingest windows by publication date instead. Cursor paging needs a key, so keyless
  // runs page by number.
  test("uses page paging and omits the cursor when a page number is given", () => {
    const u = parse(buildWorksUrl({ ...base, page: 3 }));
    expect(u.searchParams.get("page")).toBe("3");
    expect(u.searchParams.has("cursor")).toBe(false);
  });
  test("never sends a created-date filter", () => {
    expect(parse(buildWorksUrl(base)).searchParams.get("filter")).not.toContain("from_created_date");
  });
  test("adds to_publication_date when a window end is given", () => {
    expect(parse(buildWorksUrl({ ...base, toPublicationDate: "2026-10-31" })).searchParams.get("filter")).toBe(
      "primary_location.source.id:S1|S2,from_publication_date:2026-10-01,to_publication_date:2026-10-31",
    );
  });
  test("rejects a malformed publication date", () => {
    expect(() => buildWorksUrl({ ...base, toPublicationDate: "2026-1-5" })).toThrow(/YYYY-MM-DD/);
    expect(() => buildWorksUrl({ ...base, fromPublicationDate: "yesterday" })).toThrow(/YYYY-MM-DD/);
  });
  test("passes through a supplied cursor", () => {
    expect(parse(buildWorksUrl({ ...base, cursor: "abc123" })).searchParams.get("cursor")).toBe("abc123");
  });
  test("select lists exactly the required fields", () => {
    const sel = parse(buildWorksUrl(base)).searchParams.get("select");
    expect(sel).toBe(
      "id,doi,title,publication_date,primary_location,authorships,abstract_inverted_index,open_access,best_oa_location,cited_by_count,counts_by_year,type",
    );
  });
  test("omits api_key and mailto when not provided", () => {
    const u = parse(buildWorksUrl(base));
    expect(u.searchParams.has("api_key")).toBe(false);
    expect(u.searchParams.has("mailto")).toBe(false);
  });
  test("includes api_key and mailto when provided", () => {
    const u = parse(buildWorksUrl({ ...base, apiKey: "k&1", mailto: "me@example.org" }));
    expect(u.searchParams.get("api_key")).toBe("k&1");
    expect(u.searchParams.get("mailto")).toBe("me@example.org");
  });
  test("throws for empty sourceIds", () => {
    expect(() => buildWorksUrl({ ...base, sourceIds: [] })).toThrow(Error);
  });
  test("throws for more than 50 sourceIds", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `S${i}`);
    expect(() => buildWorksUrl({ ...base, sourceIds: ids })).toThrow(Error);
  });
  test("accepts exactly 50 sourceIds", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `S${i}`);
    expect(() => buildWorksUrl({ ...base, sourceIds: ids })).not.toThrow();
  });
});

describe("budget guard", () => {
  // Bug found in the first real run: the guard assumed a $1/day limit, so a keyless $0.10 budget
  // with $0.0999 left was treated as exhausted. Spent = limit - remaining, from OpenAlex's headers.
  test("parseSpend reads the daily limit header", async () => {
    const { parseSpend } = await import("@/lib/openalex/client");
    const h = new Headers({ "x-ratelimit-limit-usd": "0.1", "x-ratelimit-remaining-usd": "0.0999", "x-ratelimit-cost-usd": "0.0001" });
    expect(parseSpend(h)).toEqual({ costUsd: 0.0001, remainingUsd: 0.0999, limitUsd: 0.1 });
  });
  test("does not stop a fresh keyless budget", async () => {
    const { shouldStopForBudget } = await import("@/lib/openalex/client");
    expect(shouldStopForBudget({ costUsd: 0.0001, remainingUsd: 0.0999, limitUsd: 0.1 }, 0.8)).toBe(false);
  });
  test("stops once spend reaches the cap on a $1 key", async () => {
    const { shouldStopForBudget } = await import("@/lib/openalex/client");
    expect(shouldStopForBudget({ costUsd: 0.0001, remainingUsd: 0.19, limitUsd: 1 }, 0.8)).toBe(true);
  });
  test("stops when less than 5% of the budget is left, whatever the cap", async () => {
    const { shouldStopForBudget } = await import("@/lib/openalex/client");
    expect(shouldStopForBudget({ costUsd: 0.0001, remainingUsd: 0.004, limitUsd: 0.1 }, 0.8)).toBe(true);
  });
  test("never stops when the headers are missing", async () => {
    const { shouldStopForBudget } = await import("@/lib/openalex/client");
    expect(shouldStopForBudget({ costUsd: null, remainingUsd: null, limitUsd: null }, 0.8)).toBe(false);
  });
});
