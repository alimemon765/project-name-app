import { describe, expect, test } from "vitest";
import { decodeCursor, encodeCursor } from "@/lib/feed/cursor";

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64url");

describe("feed cursor", () => {
  test("round-trips a numeric key", () => {
    const c = { key: 12.5, id: "W123" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });
  test("round-trips a string key", () => {
    const c = { key: "2026-10-20", id: "W123" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });
  test("round-trips unicode and special characters", () => {
    const c = { key: "ünï/çødé+=🌊", id: "a b/c?d&e=f" };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
  });
  test("round-trips zero key", () => {
    expect(decodeCursor(encodeCursor({ key: 0, id: "x" }))).toEqual({ key: 0, id: "x" });
  });
  test("output is base64url without +, / or =", () => {
    for (let i = 0; i < 200; i++) {
      const out = encodeCursor({ key: `>>>???${i}~~~`, id: "i".repeat(i) });
      expect(out).toMatch(/^[A-Za-z0-9_-]+$/);
    }
  });
  test("returns null for null, undefined and empty", () => {
    expect(decodeCursor(null)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor("")).toBeNull();
  });
  test("returns null for garbage", () => {
    expect(decodeCursor("!!!not-a-cursor!!!")).toBeNull();
    expect(decodeCursor("%%%")).toBeNull();
  });
  test("returns null for valid base64url that is not JSON", () => {
    expect(decodeCursor(b64url("hello world"))).toBeNull();
  });
  test("returns null for tampered (truncated) cursor", () => {
    const enc = encodeCursor({ key: 5, id: "abc" });
    expect(decodeCursor(enc.slice(0, enc.length - 4))).toBeNull();
  });
  test("returns null when id is missing", () => {
    expect(decodeCursor(b64url(JSON.stringify({ key: 1 })))).toBeNull();
  });
  test("returns null when key is missing", () => {
    expect(decodeCursor(b64url(JSON.stringify({ id: "a" })))).toBeNull();
  });
  test("returns null when key has wrong type", () => {
    expect(decodeCursor(b64url(JSON.stringify({ key: { a: 1 }, id: "a" })))).toBeNull();
    expect(decodeCursor(b64url(JSON.stringify({ key: null, id: "a" })))).toBeNull();
    expect(decodeCursor(b64url(JSON.stringify({ key: [1], id: "a" })))).toBeNull();
  });
  test("returns null when id has wrong type", () => {
    expect(decodeCursor(b64url(JSON.stringify({ key: 1, id: 7 })))).toBeNull();
  });
  test("returns null for non-object JSON", () => {
    expect(decodeCursor(b64url("null"))).toBeNull();
    expect(decodeCursor(b64url("42"))).toBeNull();
    expect(decodeCursor(b64url('"str"'))).toBeNull();
    expect(decodeCursor(b64url("[1,\"a\"]"))).toBeNull();
  });
  test("returns null for non-finite numeric key", () => {
    expect(decodeCursor(b64url('{"key":1e999,"id":"a"}'))).toBeNull();
  });
  test("never throws on arbitrary input", () => {
    for (const s of ["\u0000", "e30", "{", "====", "a".repeat(10000)]) {
      expect(() => decodeCursor(s)).not.toThrow();
    }
  });
});

describe("cursor sort tag", () => {
  test("round-trips the sort that produced it", () => {
    expect(decodeCursor(encodeCursor({ key: 50, id: "abc", sort: "cited" }))).toEqual({ key: 50, id: "abc", sort: "cited" });
  });
  test("a cursor without a sort decodes without one", () => {
    expect(decodeCursor(encodeCursor({ key: "2026-10-01", id: "abc" }))).toEqual({ key: "2026-10-01", id: "abc" });
  });
  test("a non-string sort is dropped", () => {
    const raw = Buffer.from(JSON.stringify({ k: 1, i: "x", s: 5 })).toString("base64url");
    expect(decodeCursor(raw)).toEqual({ key: 1, id: "x" });
  });
});
