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
