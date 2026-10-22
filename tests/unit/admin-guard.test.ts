import { describe, expect, test } from "vitest";
import { isLocalAdmin } from "@/lib/admin/guard";

describe("isLocalAdmin", () => {
  test.each(["localhost:3200", "127.0.0.1:3200", "[::1]:3200", "localhost"])("allows %s when enabled", (host) => {
    expect(isLocalAdmin(host, "1")).toBe(true);
  });
  test.each(["192.168.1.2:3200", "example.org", "localhost.example.org", "127.0.0.1.nip.io", "", null])("refuses %s", (host) => {
    expect(isLocalAdmin(host, "1")).toBe(false);
  });
  test.each([undefined, "", "0", "true", "yes"])("refuses everything unless ADMIN_LABELS is exactly 1 (got %s)", (flag) => {
    expect(isLocalAdmin("localhost:3200", flag)).toBe(false);
  });
});

describe("isLocalAdmin on a hosted deployment", () => {
  test("refuses even with the flag and a localhost Host when running on Vercel", () => {
    expect(isLocalAdmin("localhost:3200", "1", { VERCEL: "1" })).toBe(false);
    expect(isLocalAdmin("localhost:3200", "1", { VERCEL_ENV: "production" })).toBe(false);
    expect(isLocalAdmin("localhost:3200", "1", {})).toBe(true);
  });
});
