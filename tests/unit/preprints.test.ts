import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { parseArxivFeed, buildArxivUrl, arxivIdFromUrl } from "@/lib/preprints/arxiv";
import { parseEssoarPage, buildEssoarUrl, parseSsrnPage, buildSsrnUrl } from "@/lib/preprints/crossref";
import { parseOaiPage, buildOaiUrl } from "@/lib/preprints/oai";
import { passesStrictGate } from "@/lib/preprints/gate";
import type { KeywordRule } from "@/lib/classify/keywords";

const fx = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("arXiv", () => {
  test("parses every entry with id, DOI, authors and dates", () => {
    const { records, total } = parseArxivFeed(fx("arxiv-feed.xml"));
    expect(total).toBe(8849);
    expect(records).toHaveLength(3);
    const r = records[0];
    expect(r).toMatchObject({
      server: "arxiv", arxivId: "2610.28219", sourceId: "2610.28219", doi: "10.48550/arxiv.2610.28219",
      pubDate: "2026-10-20", url: "https://arxiv.org/abs/2610.28219", isOa: true,
    });
    expect(r.title).toMatch(/^Disentangling forced and internal components/);
    expect(r.authors.slice(0, 2)).toEqual(["Parvathi Kooloth", "Wenyu Zhou"]);
    expect(r.abstract).toMatch(/^Attribution of observed historical climate/);
    expect(r.abstract).not.toMatch(/\n/);
  });
  test("strips the version suffix and handles old-style ids", () => {
    expect(arxivIdFromUrl("http://arxiv.org/abs/2610.28219v3")).toBe("2610.28219");
    expect(arxivIdFromUrl("http://arxiv.org/abs/physics/0601001v1")).toBe("physics/0601001");
    expect(arxivIdFromUrl("not a url")).toBeNull();
  });
  test("reads the journal DOI when the entry has one", () => {
    const xml = fx("arxiv-feed.xml").replace("<arxiv:primary_category", "<arxiv:doi>10.1029/2026GL000001</arxiv:doi><arxiv:primary_category");
    expect(parseArxivFeed(xml).records[0].publishedDoi).toBe("10.1029/2026gl000001");
  });
  test("an empty or malformed feed yields no records", () => {
    expect(parseArxivFeed("<feed xmlns='http://www.w3.org/2005/Atom'></feed>").records).toEqual([]);
    expect(parseArxivFeed("garbage").records).toEqual([]);
  });
  test("builds a sorted, paged query URL", () => {
    const u = new URL(buildArxivUrl({ query: "cat:physics.ao-ph OR cat:physics.geo-ph", start: 200, max: 100 }));
    expect(u.origin + u.pathname).toBe("https://export.arxiv.org/api/query");
    expect(u.searchParams.get("search_query")).toBe("cat:physics.ao-ph OR cat:physics.geo-ph");
    expect(u.searchParams.get("sortBy")).toBe("submittedDate");
    expect(u.searchParams.get("sortOrder")).toBe("descending");
    expect(u.searchParams.get("start")).toBe("200");
    expect(u.searchParams.get("max_results")).toBe("100");
  });
});

describe("ESSOAr via Crossref", () => {
  test("keeps only ESSOAr DOIs and maps the fields", () => {
    const { records, nextCursor } = parseEssoarPage(JSON.parse(fx("crossref-essoar.json")));
    expect(nextCursor).toBe("CURSOR2");
    expect(records.map((r) => r.doi)).toEqual(["10.22541/essoar.15008252/v1", "10.22541/essoar.15008255/v1"]);
    const r = records[0];
    expect(r).toMatchObject({ server: "essoar", sourceId: "10.22541/essoar.15008252/v1", pubDate: "2026-09-03", isOa: true });
    expect(r.title).toBe("The seasonal, polar-amplified climate response to a latent heat transport forcing");
    expect(r.authors[0]).toBe("Po-Chun Chung");
    expect(r.abstract).toMatch(/^Polar amplification is a well-documented/);
    expect(r.abstract).not.toMatch(/<\/?jats:/);
  });
  test("reads is-preprint-of as the published DOI", () => {
    const page = JSON.parse(fx("crossref-essoar.json"));
    page.message.items[0].relation = { "is-preprint-of": [{ "id-type": "doi", id: "10.1029/2026JD000002" }] };
    expect(parseEssoarPage(page).records[0].publishedDoi).toBe("10.1029/2026jd000002");
  });
  test("a failed response yields no records and no cursor", () => {
    expect(parseEssoarPage({ status: "failed", message: [] })).toEqual({ records: [], nextCursor: null });
  });
  test("builds a prefix query with posted-date window, cursor and mailto", () => {
    const u = new URL(buildEssoarUrl({ from: "2026-09-01", to: "2026-09-30", cursor: "*", mailto: "a@b.org" }));
    expect(u.pathname).toBe("/prefixes/10.22541/works");
    expect(u.searchParams.get("filter")).toBe("type:posted-content,from-posted-date:2026-09-01,until-posted-date:2026-09-30");
    expect(u.searchParams.get("rows")).toBe("1000");
    expect(u.searchParams.get("cursor")).toBe("*");
    expect(u.searchParams.get("mailto")).toBe("a@b.org");
  });
});

describe("SSRN via Crossref", () => {
  // OpenAlex dates every SSRN work 1 January of its year; Crossref's DOI registration time is exact.
  test("maps SSRN records using the DOI registration date", () => {
    const { records, nextCursor } = parseSsrnPage(JSON.parse(fx("crossref-ssrn.json")));
    expect(nextCursor).toBe("CURSOR2");
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({ server: "ssrn", doi: "10.2139/ssrn.7372978", sourceId: "10.2139/ssrn.7372978", pubDate: "2026-09-01" });
    expect(records[0].abstract).toMatch(/^What survives after temporal leakage/);
  });
  test("ignores non-SSRN DOIs", () => {
    const page = JSON.parse(fx("crossref-ssrn.json"));
    page.message.items[0].DOI = "10.1016/j.example.2026.1";
    expect(parseSsrnPage(page).records.map((r) => r.doi)).not.toContain("10.1016/j.example.2026.1");
  });
  test("builds a created-date window on the SSRN prefix", () => {
    const u = new URL(buildSsrnUrl({ from: "2026-09-01", to: "2026-09-30", cursor: "*" }));
    expect(u.pathname).toBe("/prefixes/10.2139/works");
    expect(u.searchParams.get("filter")).toBe("from-created-date:2026-09-01,until-created-date:2026-09-30");
    expect(u.searchParams.get("select")).toContain("created");
  });
});

describe("EarthArXiv via OAI-PMH", () => {
  test("parses records with the EarthArXiv DOI and the resumption token", () => {
    const { records, resumptionToken } = parseOaiPage(fx("eartharxiv-oai.xml"));
    expect(resumptionToken).toBe("metadataPrefix%3Doai_dc%26from%3D2026-09-01%26page%3D2");
    expect(records).toHaveLength(3);
    const r = records[0];
    expect(r).toMatchObject({ server: "eartharxiv", sourceId: "oai:EA:id:14736", doi: "10.31223/x5dr47", pubDate: "2026-09-01", isOa: true,
      url: "https://doi.org/10.31223/x5dr47" });
    expect(r.title).toBe("Soil Seed Banks of Invasive Plant Species of the Lower Mississippi River Delta");
    expect(r.authors[0]).toBe("Beth a Middleton");
  });
  test("keeps the text after an 'Abstract' heading and drops contact lines", () => {
    const r = parseOaiPage(fx("eartharxiv-oai.xml")).records[0];
    expect(r.abstract).toMatch(/^The invasion routes of non-native species/);
    expect(r.abstract).not.toMatch(/Email/);
  });
  test("no token on the last page; malformed XML yields nothing", () => {
    const last = fx("eartharxiv-oai.xml").replace(/<resumptionToken[^>]*>[\s\S]*?<\/resumptionToken>/, "<resumptionToken completeListSize=\"351\"/>");
    expect(parseOaiPage(last).resumptionToken).toBeNull();
    expect(parseOaiPage("garbage")).toEqual({ records: [], resumptionToken: null });
  });
  test("builds first-page and resumption URLs", () => {
    expect(buildOaiUrl({ from: "2026-09-01" })).toBe("https://eartharxiv.org/api/oai/?verb=ListRecords&metadataPrefix=oai_dc&from=2026-09-01");
    expect(buildOaiUrl({ from: "2026-09-01", resumptionToken: "a%3Db" })).toBe("https://eartharxiv.org/api/oai/?verb=ListRecords&resumptionToken=a%253Db");
  });
});

describe("strict gate", () => {
  const rules: KeywordRule[] = [
    { topicId: 2, term: "storm surge", weight: 1, kind: "include" },
    { topicId: 9, term: "flood", weight: 1.5, kind: "include" },
  ];
  test("passes a title hit", () => {
    expect(passesStrictGate({ title: "Storm surge in the Bay of Bengal", abstract: null }, rules).topicIds).toEqual([2]);
  });
  test("rejects a single abstract-only mention that the normal threshold would keep", () => {
    expect(passesStrictGate({ title: "Atmospheric rivers", abstract: "We mention flood once." }, rules).topicIds).toEqual([]);
  });
  test("passes two abstract mentions of the same topic", () => {
    const rules2: KeywordRule[] = [...rules, { topicId: 9, term: "inundation", weight: 1, kind: "include" }];
    expect(passesStrictGate({ title: "Atmospheric rivers", abstract: "flood and inundation" }, rules2).topicIds).toEqual([9]);
  });
});
