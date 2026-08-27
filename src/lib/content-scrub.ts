/** Shared forbidden-phrase scrub for AI mirror outputs and reread reasons. */

export const FORBIDDEN_MIRROR_PATTERNS: RegExp[] = [
  /하나님이\s*당신(?:에게|께)?\s*말씀/i,
  /하나님은\s*당신이\s*반드시/i,
  /믿음이\s*부족/i,
  /믿음이\s*(약|강)하다/i,
  /당신은\s*죄\s*가운데/i,
  /이것이\s*당신의\s*소명/i,
  /기도가\s*응답되지\s*않은\s*이유/i,
  /하나님이\s*원하(?:신다|십니다|시는\s*것)/i,
];

/** Extra prescription/oracle tones for scripture re-visit reasons. */
export const FORBIDDEN_SCRIPTURE_EXTRA_PATTERNS: RegExp[] = [
  /추천\s*성구/i,
  /오늘의\s*성구/i,
  /지금\s*필요한\s*말씀/i,
  /하나님이\s*주시는/i,
  /이\s*말씀이\s*답/i,
  /이\s*구절을\s*붙/i,
];
/** Wisdom middleware: 동양 철학 용어 차단 (사용자에게 노출 금지) */
export const FORBIDDEN_WISDOM_PATTERNS: RegExp[] = [
  /주역/i,
  /괘[사상]?/,
  /효사/,
  /음양/,
  /군자/,
  /소인/,
  /[乾坤震巽坎離艮兌]/,
  /태극/,
  /육십사괘|64괘/,
  /점[괘술]/,
  /길흉/,
];

const REPLACEMENT = "기록에서 관찰되는 흐름";

export type ScrubMirrorOptions = {
  includeScriptureExtras?: boolean;
  includeWisdomPatterns?: boolean;
  collapseWhitespace?: boolean;
};

export function scrubMirrorText(
  text: string,
  opts?: ScrubMirrorOptions,
): string {
  let out = text;
  for (const pattern of FORBIDDEN_MIRROR_PATTERNS) {
    out = out.replace(pattern, REPLACEMENT);
  }
  if (opts?.includeScriptureExtras) {
    for (const pattern of FORBIDDEN_SCRIPTURE_EXTRA_PATTERNS) {
      out = out.replace(pattern, REPLACEMENT);
    }
  }
  if (opts?.includeWisdomPatterns !== false) {
    for (const pattern of FORBIDDEN_WISDOM_PATTERNS) {
      out = out.replace(pattern, REPLACEMENT);
    }
  }
  if (opts?.collapseWhitespace) {
    out = out.replace(/\s+/g, " ").trim();
  }
  return out;
}

export function deepScrubMirror<T>(value: T, opts?: ScrubMirrorOptions): T {
  if (typeof value === "string") return scrubMirrorText(value, opts) as T;
  if (Array.isArray(value)) {
    return value.map((item) => deepScrubMirror(item, opts)) as T;
  }
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      next[k] = deepScrubMirror(v, opts);
    }
    return next as T;
  }
  return value;
}
