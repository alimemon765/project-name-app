import { describe, expect, test } from "vitest";
import { parseFeedRequest, parseSince } from "@/lib/feed/api";

const req = (qs: string) => new URL(`https://x.test/api/feed?${qs}`).searchParams;

describe("parseFeedRequest", () => {
  test("splits the query from the cursor", () => {
    const r = parseFeedRequest(req("t=hydrology&sort=cited&cursor=abc"));
    expect(r).toMatchObject({ ok: true, cursor: "abc", query: { topics: ["hydrology"], sort: "cited" } });
  });
  test("a missing cursor means the first page", () => {
    expect(parseFeedRequest(req("t=hydrology"))).toMatchObject({ ok: true, cursor: null });
  });
  test("rejects an oversized cursor", () => {
    expect(parseFeedRequest(req(`cursor=${"a".repeat(400)}`))).toEqual({ ok: false, error: "Invalid cursor." });
  });
  test("rejects an oversized query string outright", () => {
    expect(parseFeedRequest(req(`q=${"a".repeat(5000)}`))).toEqual({ ok: false, error: "Request too long." });
  });
});

describe("parseSince", () => {
  test("accepts an ISO timestamp in the past", () => {
    expect(parseSince("2026-10-01T10:00:00.000Z", new Date("2026-10-21T00:00:00Z"))?.toISOString()).toBe("2026-10-01T10:00:00.000Z");
  });
  test.each([null, "", "yesterday", "2099-01-01T00:00:00Z", "1999-01-01T00:00:00Z"])("rejects %s", (v) => {
    expect(parseSince(v, new Date("2026-10-21T00:00:00Z"))).toBeNull();
  });
});
