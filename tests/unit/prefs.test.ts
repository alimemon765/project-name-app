import { describe, expect, test } from "vitest";
import { DEFAULT_PREFS, decodePrefs, effectiveQuery, encodePrefs, queryToUrl, type Prefs } from "@/lib/prefs/prefs";
import { DEFAULT_QUERY } from "@/lib/feed/query";

const sp = (s: string) => new URLSearchParams(s);
const prefs = (over: Partial<Prefs>): Prefs => ({ ...DEFAULT_PREFS, ...over });

describe("prefs cookie codec", () => {
  test("round-trips", () => {
    const p = prefs({ days: 14, showPreprints: false, myTopics: ["flood-risk", "subsidence"], onboarded: true, newOnlyOnReturn: true });
    expect(decodePrefs(encodePrefs(p))).toEqual(p);
  });
  test("is cookie-safe (no ; , = or spaces in the value)", () => {
    expect(encodePrefs(prefs({ myTopics: ["flood-risk", "subsidence"], onboarded: true }))).toMatch(/^[A-Za-z0-9._~-]+$/);
  });
  test.each([undefined, "", "garbage", "d99.p2.t", "%%%"])("falls back to defaults for %s", (raw) => {
    expect(decodePrefs(raw)).toEqual(DEFAULT_PREFS);
  });
  test("only free windows are accepted from the cookie", () => {
    expect(decodePrefs(encodePrefs(prefs({ days: 14 }))).days).toBe(14);
    expect(decodePrefs("d90-p1-o0-t").days).toBe(DEFAULT_PREFS.days);
  });
  test("drops malformed topic slugs", () => {
    expect(decodePrefs("d30-p1-o1-tflood-risk.BAD!.subsidence").myTopics).toEqual(["flood-risk", "subsidence"]);
  });
});

describe("effectiveQuery: the URL wins, prefs fill what it leaves out", () => {
  test("no params: prefs supply window, preprints and topics", () => {
    const q = effectiveQuery(sp(""), prefs({ days: 7, showPreprints: false, myTopics: ["hydrology"] }));
    expect(q).toEqual({ ...DEFAULT_QUERY, days: 7, preprints: false, topics: ["hydrology"] });
  });
  test("explicit params override prefs", () => {
    const q = effectiveQuery(sp("days=30&pre=1&t=subsidence"), prefs({ days: 7, showPreprints: false, myTopics: ["hydrology"] }));
    expect(q).toMatchObject({ days: 30, preprints: true, topics: ["subsidence"] });
  });
  test("t=all means every topic even when the reader has chosen topics", () => {
    expect(effectiveQuery(sp("t=all"), prefs({ myTopics: ["hydrology"] })).topics).toEqual([]);
  });
});

describe("queryToUrl: writes only what differs from the reader's prefs", () => {
  const p = prefs({ days: 14, showPreprints: false, myTopics: ["hydrology"] });
  test("the reader's own defaults give a clean URL", () => {
    expect(queryToUrl(effectiveQuery(sp(""), p), p)).toBe("");
  });
  test("clearing my topics is written as t=all", () => {
    expect(queryToUrl({ ...effectiveQuery(sp(""), p), topics: [] }, p)).toBe("t=all");
  });
  test("a different window or preprint choice is written explicitly", () => {
    expect(queryToUrl({ ...effectiveQuery(sp(""), p), days: 30, preprints: true }, p)).toBe("pre=1&days=30");
  });
  test("round-trips through effectiveQuery for the same reader", () => {
    const q = { ...effectiveQuery(sp(""), p), q: "surge", topics: ["subsidence", "flood-risk"], oaOnly: true, sort: "cited" as const };
    expect(effectiveQuery(sp(queryToUrl(q, p)), p)).toEqual({ ...q, topics: ["flood-risk", "subsidence"] });
  });
});

describe("queryToUrl with search", () => {
  test("best match is the default while searching, so it is not written", () => {
    const q = { ...effectiveQuery(sp(""), DEFAULT_PREFS), q: "surge", sort: "relevance" as const };
    expect(queryToUrl(q, DEFAULT_PREFS)).toBe("q=surge");
    expect(queryToUrl({ ...q, sort: "new" }, DEFAULT_PREFS)).toBe("q=surge&sort=new");
  });
});

describe("new-only on return (D040)", () => {
  test("defaults to off", () => {
    expect(DEFAULT_PREFS.newOnlyOnReturn).toBe(false);
  });
  test("cookies written before the option existed still decode, with it off", () => {
    expect(decodePrefs("d14-p0-o1-tflood-risk")).toEqual({ ...DEFAULT_PREFS, days: 14, showPreprints: false, onboarded: true, myTopics: ["flood-risk"] });
  });
  test("is stored before the topics, so slugs never confuse it", () => {
    expect(encodePrefs(prefs({ newOnlyOnReturn: true, myTopics: ["sea-level-tides"] }))).toBe("d30-p1-o0-n1-tsea-level-tides");
  });
});
