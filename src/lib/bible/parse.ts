import type { BibleReference } from "./types";

const BOOK_ALIASES: Array<{ code: string; aliases: string[] }> = [
  { code: "GEN", aliases: ["창세기", "창"] },
  { code: "EXO", aliases: ["출애굽기", "출"] },
  { code: "LEV", aliases: ["레위기", "레"] },
  { code: "NUM", aliases: ["민수기", "민"] },
  { code: "DEU", aliases: ["신명기", "신"] },
  { code: "JOS", aliases: ["여호수아", "수"] },
  { code: "JDG", aliases: ["사사기", "삿"] },
  { code: "RUT", aliases: ["룻기", "룻"] },
  { code: "1SA", aliases: ["사무엘상", "삼상"] },
  { code: "2SA", aliases: ["사무엘하", "삼하"] },
  { code: "1KI", aliases: ["열왕기상", "왕상"] },
  { code: "2KI", aliases: ["열왕기하", "왕하"] },
  { code: "1CH", aliases: ["역대상", "대상"] },
  { code: "2CH", aliases: ["역대하", "대하"] },
  { code: "EZR", aliases: ["에스라", "스"] },
  { code: "NEH", aliases: ["느헤미야", "느"] },
  { code: "EST", aliases: ["에스더", "에"] },
  { code: "JOB", aliases: ["욥기", "욥"] },
  { code: "PSA", aliases: ["시편", "시"] },
  { code: "PRO", aliases: ["잠언", "잠"] },
  { code: "ECC", aliases: ["전도서", "전"] },
  { code: "SNG", aliases: ["아가", "아"] },
  { code: "ISA", aliases: ["이사야", "사"] },
  { code: "JER", aliases: ["예레미야", "렘"] },
  { code: "LAM", aliases: ["예레미야애가", "애가", "애"] },
  { code: "EZE", aliases: ["에스겔", "겔", "EZK"] },
  { code: "DAN", aliases: ["다니엘", "단"] },
  { code: "HOS", aliases: ["호세아", "호"] },
  { code: "JOL", aliases: ["요엘", "욜"] },
  { code: "AMO", aliases: ["아모스", "암"] },
  { code: "OBA", aliases: ["오바댜", "옵"] },
  { code: "JON", aliases: ["요나", "욘"] },
  { code: "MIC", aliases: ["미가", "미"] },
  { code: "NAM", aliases: ["나훔", "나"] },
  { code: "HAB", aliases: ["하박국", "합"] },
  { code: "ZEP", aliases: ["스바냐", "습"] },
  { code: "HAG", aliases: ["학개", "학"] },
  { code: "ZEC", aliases: ["스가랴", "슥"] },
  { code: "MAL", aliases: ["말라기", "말"] },
  { code: "MAT", aliases: ["마태복음", "마"] },
  { code: "MAR", aliases: ["마가복음", "막", "MRK"] },
  { code: "LUK", aliases: ["누가복음", "눅"] },
  { code: "JOH", aliases: ["요한복음", "요", "JHN", "John"] },
  { code: "ACT", aliases: ["사도행전", "행"] },
  { code: "ROM", aliases: ["로마서", "롬"] },
  { code: "1CO", aliases: ["고린도전서", "고전"] },
  { code: "2CO", aliases: ["고린도후서", "고후"] },
  { code: "GAL", aliases: ["갈라디아서", "갈"] },
  { code: "EPH", aliases: ["에베소서", "엡"] },
  { code: "PHI", aliases: ["빌립보서", "빌", "PHP"] },
  { code: "COL", aliases: ["골로새서", "골"] },
  { code: "1TH", aliases: ["데살로니가전서", "살전"] },
  { code: "2TH", aliases: ["데살로니가후서", "살후"] },
  { code: "1TI", aliases: ["디모데전서", "딤전"] },
  { code: "2TI", aliases: ["디모데후서", "딤후"] },
  { code: "TIT", aliases: ["디도서", "딛"] },
  { code: "PHM", aliases: ["빌레몬서", "몬"] },
  { code: "HEB", aliases: ["히브리서", "히"] },
  { code: "JAM", aliases: ["야고보서", "약", "JAS"] },
  { code: "1PE", aliases: ["베드로전서", "벧전"] },
  { code: "2PE", aliases: ["베드로후서", "벧후"] },
  { code: "1JO", aliases: ["요한일서", "요일", "1JN"] },
  { code: "2JO", aliases: ["요한이서", "요이", "2JN"] },
  { code: "3JO", aliases: ["요한삼서", "요삼", "3JN"] },
  { code: "JUD", aliases: ["유다서", "유"] },
  { code: "REV", aliases: ["요한계시록", "계시록", "계"] },
];
const KOREAN_BOOK_NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  BOOK_ALIASES.map((book) => [book.code, book.aliases[0]]),
);

// 영문 코드 → 한글 단축형(2자 이내). "HEB 13:9" → "히 13:9" 처럼 짧은 약어로
// 표기할 때 사용. aliases[0]이 풀네임이므로 그 다음 alias가 단축형이라는 가정.
// 별칭이 1~2자 한글인 경우만 단축형으로 인정.
const KOREAN_SHORT_CODE_BY_BOOK_CODE: Record<string, string> = Object.fromEntries(
  BOOK_ALIASES.map((book) => {
    const short = book.aliases.find((a) => /^[가-힣]{1,2}$/.test(a));
    return [book.code, short ?? book.aliases[0]];
  }),
);

export { BOOK_ALIASES };

const ALIAS_TO_CODE = new Map<string, string>();
for (const book of BOOK_ALIASES) {
  ALIAS_TO_CODE.set(book.code.toLowerCase(), book.code);
  for (const alias of book.aliases) {
    ALIAS_TO_CODE.set(alias.toLowerCase(), book.code);
    ALIAS_TO_CODE.set(alias, book.code);
  }
}

const BOOK_PATTERN = [...ALIAS_TO_CODE.keys()]
  .sort((a, b) => b.length - a.length)
  .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

const REFERENCE_PATTERN = new RegExp(
  `(?<![\\p{L}\\p{N}])(${BOOK_PATTERN})\\s*(\\d{1,3})\\s*[:：장]?\\s*(\\d{1,3})(?:\\s*[-–~]\\s*(\\d{1,3}))?`,
  "giu",
);

function keyOf(reference: BibleReference) {
  return `${reference.code}-${reference.chapter}-${reference.startVerse}-${reference.endVerse}`;
}

function normalizeBook(alias: string) {
  return ALIAS_TO_CODE.get(alias.toLowerCase()) ?? ALIAS_TO_CODE.get(alias);
}

function buildReference(
  code: string,
  chapter: number,
  startVerse: number,
  endVerse = startVerse,
): BibleReference | null {
  if (!Number.isInteger(chapter) || !Number.isInteger(startVerse) || !Number.isInteger(endVerse)) {
    return null;
  }
  if (chapter < 1 || startVerse < 1 || endVerse < startVerse) return null;
  return { code, chapter, startVerse, endVerse };
}

export function parseBibleReferences(input: string): BibleReference[] {
  const references: BibleReference[] = [];
  const seen = new Set<string>();

  for (const match of input.matchAll(REFERENCE_PATTERN)) {
    const code = normalizeBook(match[1] ?? "");
    if (!code) continue;
    const chapter = Number(match[2]);
    const start = Number(match[3]);
    const end = match[4] ? Number(match[4]) : start;
    const ref = buildReference(code, chapter, start, end);
    if (ref && !seen.has(keyOf(ref))) {
      seen.add(keyOf(ref));
      references.push(ref);
    }
  }

  return references;
}

export function formatBibleReferenceKey(reference: BibleReference) {
  return keyOf(reference);
}

export function displayCrossRef(ref: {
  targetCode: string;
  targetChapter: number;
  targetStart: number;
  targetEnd: number;
  targetRef: string;
}): string {
  const name = KOREAN_BOOK_NAME_BY_CODE[ref.targetCode.toUpperCase()];
  if (!name || !Number.isInteger(ref.targetChapter) || ref.targetChapter < 1 || !Number.isInteger(ref.targetStart) || ref.targetStart < 1) {
    return ref.targetRef;
  }
  const base = `${name} ${ref.targetChapter}:${ref.targetStart}`;
  return Number.isInteger(ref.targetEnd) && ref.targetEnd > ref.targetStart
    ? `${base}-${ref.targetEnd}`
    : base;
}

/**
 * "붙잡을 말씀" 같이 keyVerses에 저장된 영문 약어 reference를 한국 유저가
 * 읽을 수 있는 한국어 책 이름으로 바꾼다. "EPH 5:1-6" → "에베소서 5:1-6".
 * 매핑이 없거나 형식이 다르면 입력값을 그대로 돌려준다.
 */
export function localizeKeyVerseReference(reference: string): string {
  return localizeVerseReferenceInText(reference);
}

/**
 * 본문 텍스트 안에 박힌 모든 성경 레퍼런스(영문 약어든 한글 약어든)를
 * 한국어 풀네임으로 치환한다. 매핑은 BOOK_ALIASES가 단일 source of truth.
 *
 *   "HEB 13:9은 '여러 가지...'" → "히브리서 13:9은 '여러 가지...'"
 *   "ROM 16:17-18은 ..."        → "로마서 16:17-18은 ..."
 *   "1CO 14:20은 ..."            → "고린도전서 14:20은 ..."
 *   "히 5:14는 ..."              → "히브리서 5:14는 ..."
 *   "골 1:28은 ..."              → "골로새서 1:28은 ..."
 *
 * 매핑이 없거나 형식이 다르면 해당 부분은 그대로 둔다.
 */
export function localizeVerseReferenceInText(text: string): string {
  if (!text) return text;

  // 1) 영문 코드 + 장:절[-끝절] 패턴. (HEB 13:9, ROM 16:17-18, 1CO 14:20, 2TI 1:1 등)
  //    단어 경계(\b)를 두어 'JOH' 같은 부분 매치를 막는다.
  // 2) 영문 코드 + 장만 (PSA 23 같은) 형식 — localizeKeyVerseReference 호환.
  //    chapter-only regex는 이미 :N로 변환된 영역(콜론이 들어간 풀네임)은 매치하지 않는다.
  const englishCodeRe = /\b([1-3]?[A-Z]{2,3})\s+(\d+):(\d+)(?:[-–](\d+))?\b/g;
  const afterVerse = text.replace(englishCodeRe, (whole, code, chapter, start, end) => {
    const name = KOREAN_BOOK_NAME_BY_CODE[code.toUpperCase()];
    if (!name) return whole;
    const base = `${name} ${chapter}:${start}`;
    return end ? `${base}-${end}` : base;
  });
  const englishChapterOnlyRe = /\b([1-3]?[A-Z]{2,3})\s+(\d+)\b/g;
  const result = afterVerse.replace(englishChapterOnlyRe, (whole, code, chapter) => {
    const name = KOREAN_BOOK_NAME_BY_CODE[code.toUpperCase()];
    if (!name) return whole;
    return `${name} ${chapter}`;
  });

  // 한글 약어는 영문과 달리 모호하므로(예: '요'는 요한/요셉, '사'는 사무엘/사사기)
  // BOOK_ALIASES의 한글 1~2자 단축형만 매칭한다. (마, 막, 눅, 요, 행, 롬, 고전, ...)
  // 한글 약어 → 풀네임 매핑을 BOOK_ALIASES에서 추출.
  const shortAliasToFullName = new Map<string, string>();
  for (const book of BOOK_ALIASES) {
    const fullName = book.aliases[0];
    for (const alias of book.aliases) {
      if (/^[가-힣]{1,2}$/.test(alias)) {
        shortAliasToFullName.set(alias, fullName);
      }
    }
  }
  if (shortAliasToFullName.size > 0) {
    // 한글은 \b가 동작하지 않으므로 (^|[\s,.;:!?]) / (?=...) 등으로
    // 단어 경계를 흉내낸다. look-ahead는 alphanumeric(영문/숫자)이 뒤에
    // 오지 않는 경우만 매치 → 다음 레퍼런스(예: "롬 1:1")의 시작을 막지 않는다.
    const aliases = [...shortAliasToFullName.keys()].sort((a, b) => b.length - a.length);
    const korRe = new RegExp(
      `(^|[\\s,.;:!?(\\[\\{])(${aliases.join("|")})\\s+(\\d+):(\\d+)(?:[-–](\\d+))?(?=$|[\\s,.;:!?)\\]\\}\\uAC00-\\uD7A3])`,
      "g"
    );
    return result.replace(korRe, (whole, lead, alias, chapter, start, end) => {
      const name = shortAliasToFullName.get(alias);
      if (!name) return whole;
      const base = `${name} ${chapter}:${start}`;
      return `${lead}${end ? `${base}-${end}` : base}`;
    });
  }
  return result;
}
