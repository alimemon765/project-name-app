import { describe, expect, test } from "vitest";
import { formatLocalTime } from "@/components/LocalTime";

describe("formatLocalTime", () => {
  test("India reads IST, not GMT+5:30", () => {
    expect(formatLocalTime("2026-10-21T04:10:00Z", "Asia/Kolkata")).toMatch(/9:40.*IST$/i);
    expect(formatLocalTime("2026-10-21T04:10:00Z", "Asia/Calcutta")).toMatch(/IST$/);
  });
  test("other zones keep their short name", () => {
    expect(formatLocalTime("2026-10-21T04:10:00Z", "UTC")).toMatch(/4:10.*UTC$/i);
  });
});
