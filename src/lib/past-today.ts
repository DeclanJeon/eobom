/**
 * Pure helpers for "과거의 오늘" date ranges (same calendar month/day, prior years).
 */

export type DateRange = { gte: Date; lte: Date };

/**
 * Build inclusive local-calendar day ranges for the same month/day
 * in each of the previous `yearsBack` years (not including current year).
 */
export function pastTodayDateRanges(now: Date, yearsBack = 8): DateRange[] {
  const month = now.getMonth();
  const day = now.getDate();
  const ranges: DateRange[] = [];

  for (let i = 1; i <= yearsBack; i += 1) {
    const year = now.getFullYear() - i;
    // Skip invalid calendar days (e.g. Feb 29 in non-leap years)
    const start = new Date(year, month, day, 0, 0, 0, 0);
    if (start.getFullYear() !== year || start.getMonth() !== month || start.getDate() !== day) {
      continue;
    }
    const end = new Date(year, month, day, 23, 59, 59, 999);
    ranges.push({ gte: start, lte: end });
  }

  return ranges;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
