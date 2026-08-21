/**
 * src/lib/kst.ts
 * Asia/Seoul(UTC+9 고정, DST 없음) 날짜 유틸 — 서버 로컬 타임존과 무관하게 결정적.
 * 계약(C9): dateKey·day range 계산은 반드시 이 모듈 경유. 클라이언트 값 신뢰 금지.
 */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type KstParts = { year: number; month: number; day: number };

/** 주어진 Date의 Asia/Seoul 연월일. */
export function toKstParts(date: Date): KstParts {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    year: kst.getUTCFullYear(),
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
  };
}

/** Asia/Seoul 기준 "YYYY-MM-DD". */
export function toKstDateKey(date: Date): string {
  const { year, month, day } = toKstParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** KST "YYYY-MM-DD" → 시작(00:00:00 KST) Date. */
export function kstDateKeyToStart(dateKey: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1) return null;
  // 월별 최대 일수 검증 (2/30, 2/31 등 정규화 차단)
  const maxDay = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (d > maxDay) return null;
  return new Date(Date.UTC(y, mo - 1, d) - KST_OFFSET_MS);
}

/** KST 하루 범위 [시작, 끝] — 시작 = 00:00:00.000 KST, 끝 = 23:59:59.999 KST. */
export function kstDayRange(year: number, month: number, day: number): Date[] | null {
  const start = new Date(Date.UTC(year, month - 1, day) - KST_OFFSET_MS);
  // 달력 유효성: UTC로 재구성한 연월일이 입력과 일치해야 함 (2/29 등)
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return [start, end];
}

/** 특정 경과 일수 전의 KST 시작 시각. (예: daysAgo=30 → 30일 전 00:00 KST) */
export function kstDaysAgoStart(now: Date, daysAgo: number): Date {
  const { year, month, day } = toKstParts(now);
  const todayStart = new Date(Date.UTC(year, month - 1, day) - KST_OFFSET_MS);
  return new Date(todayStart.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}
