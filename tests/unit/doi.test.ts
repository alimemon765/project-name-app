import { describe, expect, test } from "vitest";
import { normalizeDoi } from "@/lib/papers/doi";

describe("normalizeDoi", () => {
  test("lowercases a bare DOI", () => {
    expect(normalizeDoi("10.5194/NHESS-26-5119-2026")).toBe("10.5194/nhess-26-5119-2026");
  });
  test("strips https://doi.org/ prefix", () => {
    expect(normalizeDoi("https://doi.org/10.5194/NHESS-26-5119-2026")).toBe("10.5194/nhess-26-5119-2026");
  });
  test("strips http://dx.doi.org/ prefix", () => {
    expect(normalizeDoi("http://dx.doi.org/10.1000/abc123")).toBe("10.1000/abc123");
  });
  test("strips doi: prefix case-insensitively", () => {
    expect(normalizeDoi("DOI:10.1000/ABC")).toBe("10.1000/abc");
    expect(normalizeDoi("doi:10.1000/abc")).toBe("10.1000/abc");
  });
  test("strips uppercase URL prefix", () => {
    expect(normalizeDoi("HTTPS://DOI.ORG/10.1000/abc")).toBe("10.1000/abc");
  });
  test("trims surrounding whitespace", () => {
    expect(normalizeDoi("  10.1000/abc \n")).toBe("10.1000/abc");
  });
  test.each([".", ",", ";"])("strips one trailing %s after alphanumeric", (ch) => {
    expect(normalizeDoi(`10.1000/abc${ch}`)).toBe("10.1000/abc");
  });
  // Contract: a trailing ".,;" is stripped only when the DOI otherwise ends alphanumeric.
  // "10.1000/abc." (without the last dot) ends in "." so nothing is stripped. Corrected during GREEN:
  // the original expectation ("10.1000/abc.") contradicted the contract and the test below.
  test("does not strip when the remaining DOI would still end in punctuation", () => {
    expect(normalizeDoi("10.1000/abc..")).toBe("10.1000/abc..");
  });
  test("preserves legitimate SICI DOI exactly (lowercased)", () => {
    expect(normalizeDoi("10.1002/(SICI)1099-1085(199910)13:14/15<2343::AID-HYP904>3.0.CO;2-L")).toBe(
      "10.1002/(sici)1099-1085(199910)13:14/15<2343::aid-hyp904>3.0.co;2-l",
    );
  });
  test("does not strip trailing punctuation when DOI does not otherwise end alphanumeric", () => {
    expect(normalizeDoi("10.1000/abc)")).toBe("10.1000/abc)");
  });
  test("returns null for non-DOI text", () => {
    expect(normalizeDoi("not a doi")).toBeNull();
  });
  test("returns null when registrant code has too few digits", () => {
    expect(normalizeDoi("10.12/x")).toBeNull();
  });
  test("returns null when registrant code has too many digits", () => {
    expect(normalizeDoi("10.1234567890/x")).toBeNull();
  });
  test("accepts 9-digit registrant code", () => {
    expect(normalizeDoi("10.123456789/x")).toBe("10.123456789/x");
  });
  test("returns null when suffix is missing", () => {
    expect(normalizeDoi("10.1000/")).toBeNull();
  });
  test("returns null when suffix contains whitespace", () => {
    expect(normalizeDoi("10.1000/a b")).toBeNull();
  });
  test("returns null for null, undefined, empty and whitespace", () => {
    expect(normalizeDoi(null)).toBeNull();
    expect(normalizeDoi(undefined)).toBeNull();
    expect(normalizeDoi("")).toBeNull();
    expect(normalizeDoi("   ")).toBeNull();
  });
  test("returns null for prefix only", () => {
    expect(normalizeDoi("https://doi.org/")).toBeNull();
  });
});
