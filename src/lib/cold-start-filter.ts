/**
 * 설계 05§4 Cold Start Verse 필터.
 * "문맥을 떼면 오해가 큰 구절", "죄책감/판정/공포를 첫 인상으로 만들 수 있는 구절"은
 * safe cold start에서 제외한다. 장 단위 EXCLUDED_CHAPTERS(daily-scripture.ts)와 함께
 * 절 단위 2차 필터로 동작한다.
 *
 * 유지 규칙: 오독 위험이 확인된 유명 구절만 최소한으로 추가한다. 판단 문장 금지.
 */
export type VerseRefLike = { code: string; chapter: number; startVerse: number; endVerse: number };

/** key: CODE-C-V */
function verseKey(code: string, chapter: number, verse: number): string {
  return `${code.toUpperCase()}-${chapter}-${verse}`;
}

/**
 * 단독 노출 시 오독 위험이 큰 구절 (cold start 금지).
 * - 마 7:1 등 판정형 단독 인용
 * - 시 137:9 등 문맥 없이는 충격적인 표현
 * - 계 21:8 등 공포 중심 단독 인용
 */
const EXCLUDED_COLD_START_VERSES = new Set<string>([
  // 판정/비난 단독 인용 위험
  verseKey("MAT", 7, 1),
  verseKey("MAT", 23, 33),
  verseKey("LUK", 13, 3),
  // 충격적 심상 단독 노출
  verseKey("PSA", 137, 9),
  verseKey("ISA", 13, 16),
  // 공포/심판이 첫인상이 되는 대표 구절
  verseKey("REV", 21, 8),
  verseKey("REV", 14, 11),
  verseKey("MAR", 9, 48),
  verseKey("MAT", 8, 12),
  verseKey("EXO", 21, 20),
  verseKey("DEU", 28, 53),
  // 저주/심판 선언 단독
  verseKey("JER", 20, 14),
  verseKey("PSA", 58, 10),
]);

export function isExcludedColdStartVerse(code: string, chapter: number, verse: number): boolean {
  return EXCLUDED_COLD_START_VERSES.has(verseKey(code, chapter, verse));
}

/** 범위 선택(ref)이 금지 구절을 포함하는지 — 하나라도 걸리면 후보에서 제외. */
export function refTouchesExcludedVerse(ref: VerseRefLike): boolean {
  for (let v = ref.startVerse; v <= ref.endVerse; v += 1) {
    if (isExcludedColdStartVerse(ref.code, ref.chapter, v)) return true;
  }
  return false;
}
