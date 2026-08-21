/**
 * Pure helpers for "과거의 오늘" date ranges (same calendar month/day, prior years).
 * v2: Asia/Seoul 기준으로 통합 (C9) — 서버 로컬 타임존에 의존하지 않는다.
 */
import { kstDayRange, toKstParts } from "@/lib/kst";

export type DateRange = { gte: Date; lte: Date };

/**
 * Build inclusive KST day ranges for the same month/day in each of the previous
 * `yearsBack` years (not including current year).
 */
export function pastTodayDateRanges(now: Date, yearsBack = 8): DateRange[] {
  const { year, month, day } = toKstParts(now);
  const ranges: DateRange[] = [];

  for (let i = 1; i <= yearsBack; i += 1) {
    const pastYear = year - i;
    // Skip invalid calendar days (e.g. Feb 29 in non-leap years)
    const range = kstDayRange(pastYear, month, day);
    if (!range) continue;
    ranges.push({ gte: range[0], lte: range[1] });
  }

  return ranges;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  const pa = toKstParts(a);
  const pb = toKstParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}
