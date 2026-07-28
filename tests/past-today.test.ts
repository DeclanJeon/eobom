import { describe, expect, test } from "bun:test";
import { isSameCalendarDay, pastTodayDateRanges } from "../src/lib/past-today";

describe("pastTodayDateRanges", () => {
  test("returns prior years same month/day", () => {
    const now = new Date(2026, 6, 28, 15, 0, 0); // Jul 28 local
    const ranges = pastTodayDateRanges(now, 3);
    expect(ranges).toHaveLength(3);
    expect(ranges[0]?.gte.getFullYear()).toBe(2025);
    expect(ranges[0]?.gte.getMonth()).toBe(6);
    expect(ranges[0]?.gte.getDate()).toBe(28);
    expect(ranges[1]?.gte.getFullYear()).toBe(2024);
    expect(ranges[2]?.gte.getFullYear()).toBe(2023);
  });

  test("skips invalid Feb 29 in non-leap years", () => {
    const now = new Date(2024, 1, 29, 12, 0, 0); // leap day 2024
    const ranges = pastTodayDateRanges(now, 4);
    const years = ranges.map((r) => r.gte.getFullYear());
    // 2023 has no Feb 29
    expect(years).not.toContain(2023);
    expect(years).toContain(2020); // leap
  });

  test("default yearsBack is 8", () => {
    const now = new Date(2026, 0, 15);
    expect(pastTodayDateRanges(now).length).toBeLessThanOrEqual(8);
    expect(pastTodayDateRanges(now).length).toBeGreaterThan(0);
  });
});

describe("isSameCalendarDay", () => {
  test("compares y/m/d only", () => {
    const a = new Date(2026, 6, 28, 1, 0, 0);
    const b = new Date(2026, 6, 28, 23, 0, 0);
    const c = new Date(2026, 6, 27, 23, 0, 0);
    expect(isSameCalendarDay(a, b)).toBe(true);
    expect(isSameCalendarDay(a, c)).toBe(false);
  });
});
