import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  getBookName,
  getPassageFromRef,
  getVerseCounts,
  listBooks,
  parseBibleReferences,
  toDisplay,
  toSlug,
  type BibleReference,
  type ScriptureBinding,
} from "@/lib/bible";

export type DailyScripturePath = "ai" | "random";

export type DailyScriptureResult = {
  path: DailyScripturePath;
  ref: BibleReference;
  display: string;
  slug: string;
  text: string;
  background: string;
  why?: string;
  theme?: string;
};

export type EntrySnippet = {
  reflectionBody: string;
  scriptureBindings?: string | null;
  scriptureRefs?: string | null;
  emotions?: string | null;
  tags?: string | null;
  entryDate?: Date | string | null;
};

/** 묵상 부적합 장 — 족보 위주. */
const EXCLUDED_CHAPTERS = new Set([
  "1CH-1",
  "1CH-2",
  "1CH-3",
  "1CH-4",
  "1CH-5",
  "1CH-6",
  "1CH-7",
  "1CH-8",
  "1CH-9",
  "EZR-2",
  "NEH-7",
]);

const MIN_RANGE = 3;
const MAX_RANGE = 6;
const AI_ENTRY_LIMIT = 5;
const AI_BODY_CHARS = 300;
const AI_TIMEOUT_MS = 30_000;

type BookIntro = { code: string; intro: string };

let bookIntroMap: Map<string, string> | null = null;
let chapterPool: Array<{ code: string; chapter: number; verses: number }> | null =
  null;

function loadBookIntros(): Map<string, string> {
  if (bookIntroMap) return bookIntroMap;
  const file = path.join(process.cwd(), "data", "bible", "ko", "book-intros.json");
  const rows = JSON.parse(readFileSync(file, "utf8")) as BookIntro[];
  bookIntroMap = new Map(rows.map((r) => [r.code.toUpperCase(), r.intro]));
  return bookIntroMap;
}

/** 테스트 seam — 풀 재구축. */
export function resetDailyScriptureCaches() {
  bookIntroMap = null;
  chapterPool = null;
}

export function getBookIntro(code: string): string {
  const map = loadBookIntros();
  return (
    map.get(code.toUpperCase()) ||
    `${getBookName(code)}은(는) 성경의 한 책입니다. 오늘 본문의 문맥을 천천히 읽어 보세요.`
  );
}

function ensureChapterPool() {
  if (chapterPool) return chapterPool;
  const pool: Array<{ code: string; chapter: number; verses: number }> = [];
  for (const book of listBooks()) {
    const counts = getVerseCounts(book.code);
    if (!counts) continue;
    for (let c = 1; c <= book.chapters; c += 1) {
      const key = `${book.code}-${c}`;
      if (EXCLUDED_CHAPTERS.has(key)) continue;
      const verses = counts[c - 1] ?? 0;
      if (verses <= 0) continue;
      pool.push({ code: book.code, chapter: c, verses });
    }
  }
  chapterPool = pool;
  return pool;
}

/** 결정적 해시 → 0..max-1. */
export function hashToIndex(seed: string, max: number): number {
  if (max <= 0) return 0;
  const hex = createHash("sha256").update(seed).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16) % max;
}

/** 일일 발송 시각 — 한국시간 오전 7시 고정. */
export const DAILY_SEND_HOUR_KST = 7;

export function toKstParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number;
  dateKey: string;
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  const minute = Number(parts.minute);
  return {
    year,
    month,
    day,
    hour,
    minute,
    dayOfWeek: weekdayMap[parts.weekday] ?? 0,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
}

export function chapterKey(ref: Pick<BibleReference, "code" | "chapter">): string {
  return `${ref.code.toUpperCase()}-${ref.chapter}`;
}

export function parseRecentSlugs(metaList: Array<string | null | undefined>): string[] {
  return metaList.filter((m): m is string => Boolean(m && m.trim()));
}

export function recentChapterKeys(slugs: string[]): Set<string> {
  const set = new Set<string>();
  for (const slug of slugs) {
    const m = slug
      .trim()
      .toUpperCase()
      .match(/^([0-9A-Z]{3})-(\d{1,3})-/);
    if (m) set.add(`${m[1]}-${Number(m[2])}`);
  }
  return set;
}

function pickRange(
  verses: number,
  seed: string,
): { startVerse: number; endVerse: number } {
  if (verses <= 0) return { startVerse: 1, endVerse: 1 };
  if (verses < MIN_RANGE) return { startVerse: 1, endVerse: verses };
  const maxLen = Math.min(MAX_RANGE, verses);
  const len = MIN_RANGE + hashToIndex(`${seed}:len`, maxLen - MIN_RANGE + 1);
  const maxStart = verses - len + 1;
  const startVerse = 1 + hashToIndex(`${seed}:start`, maxStart);
  return { startVerse, endVerse: startVerse + len - 1 };
}

export function selectRandomScripture(opts: {
  seed: string;
  excludeChapters?: Set<string>;
}): DailyScriptureResult {
  const pool = ensureChapterPool();
  const exclude = opts.excludeChapters ?? new Set<string>();
  const candidates = pool.filter(
    (c) => !exclude.has(`${c.code}-${c.chapter}`),
  );
  const usable = candidates.length > 0 ? candidates : pool;
  // 절 수 가중 선택
  const totalWeight = usable.reduce((sum, c) => sum + c.verses, 0);
  let ticket = hashToIndex(`${opts.seed}:chapter`, totalWeight);
  let chosen = usable[0];
  for (const c of usable) {
    ticket -= c.verses;
    if (ticket < 0) {
      chosen = c;
      break;
    }
  }
  const range = pickRange(chosen.verses, `${opts.seed}:${chosen.code}:${chosen.chapter}`);
  const ref: BibleReference = {
    code: chosen.code,
    chapter: chosen.chapter,
    startVerse: range.startVerse,
    endVerse: range.endVerse,
  };
  return buildResult("random", ref);
}

/**
 * 전역 오늘의 말씀 — (KST dateKey)만으로 결정되는 모두 동일한 카드 (C2·GATE-2).
 * 게스트/비소유자 노출용. 사용자 seed 사용 금지 (개인화·운세적 해석 차단).
 */
export function selectGlobalScripture(now: Date): DailyScriptureResult {
  const kst = toKstParts(now);
  return selectRandomScripture({ seed: kst.dateKey });
}

function buildResult(
  path: DailyScripturePath,
  ref: BibleReference,
  extra?: { background?: string; why?: string; theme?: string },
): DailyScriptureResult {
  const passage = getPassageFromRef(ref);
  const text =
    passage?.verses.map((v) => v.text).join(" ").replace(/\s+/g, " ").trim() ||
    "";
  return {
    path,
    ref,
    display: toDisplay(ref),
    slug: toSlug(ref),
    text,
    background: extra?.background || getBookIntro(ref.code),
    why: extra?.why,
    theme: extra?.theme,
  };
}

export function collectRecordedRefs(entries: EntrySnippet[]): {
  displays: string[];
  slugs: Set<string>;
  chapterKeys: Set<string>;
} {
  const displays: string[] = [];
  const slugs = new Set<string>();
  const chapterKeys = new Set<string>();

  for (const entry of entries) {
    let bindings: ScriptureBinding[] = [];
    if (entry.scriptureBindings) {
      try {
        const parsed = JSON.parse(entry.scriptureBindings) as ScriptureBinding[];
        if (Array.isArray(parsed)) bindings = parsed;
      } catch {
        // ignore
      }
    }
    if (bindings.length === 0 && entry.scriptureRefs) {
      try {
        const refs = JSON.parse(entry.scriptureRefs) as string[];
        if (Array.isArray(refs)) {
          for (const text of refs) {
            for (const ref of parseBibleReferences(String(text))) {
              bindings.push({
                code: ref.code,
                chapter: ref.chapter,
                startVerse: ref.startVerse,
                endVerse: ref.endVerse,
                display: toDisplay(ref),
                slug: toSlug(ref),
                translation: "ko-open-bible",
              });
            }
          }
        }
      } catch {
        // ignore
      }
    }
    for (const b of bindings) {
      if (b.display) displays.push(b.display);
      if (b.slug) slugs.add(b.slug.toUpperCase());
      if (b.code && b.chapter) chapterKeys.add(chapterKey(b));
    }
  }
  return { displays, slugs, chapterKeys };
}

function buildAiPrompt(opts: {
  entries: EntrySnippet[];
  forbiddenDisplays: string[];
  recentEmailDisplays: string[];
}): { system: string; user: string } {
  const snippets = opts.entries.slice(0, AI_ENTRY_LIMIT).map((e, i) => {
    const body = (e.reflectionBody || "").trim().slice(0, AI_BODY_CHARS);
    let emotions = "";
    let tags = "";
    try {
      emotions = JSON.parse(e.emotions || "[]").join(", ");
    } catch {
      emotions = "";
    }
    try {
      tags = JSON.parse(e.tags || "[]").join(", ");
    } catch {
      tags = "";
    }
    return `[기록 ${i + 1}]\n본문: ${body}\n감정: ${emotions || "—"}\n태그: ${tags || "—"}`;
  });

  const system = `당신은 개인 묵상 기록을 돕는 성찰 도우미입니다.
절대 금지: 하나님의 뜻을 판정, 믿음 평가, 죄 확정, 소명 선언, 예언, 의료/법률 단정, "당신은 ~해야 한다"는 처방.
배경은 역사·문학·문맥 사실만. 한국어 JSON 객체 하나만 출력하세요.

형식:
{
  "scripture": { "code": "PSA", "chapter": 42, "startVerse": 1, "endVerse": 5 },
  "theme": "한 단어 주제",
  "why": "선택 이유 1~2문장 (기록 주제와 연결, 처방 금지)",
  "background": "본문 배경 3~4문장 (저자·상황·문학적 맥락)"
}

code는 영어 3글자 책 코드(GEN, EXO, PSA, MAT, JOH 등)입니다.
이미 기록한 성구나 최근에 이메일로 보낸 성구는 선택하지 마세요.`;

  const user = `최근 기록:
${snippets.join("\n\n")}

선택 금지(이미 기록한 성구):
${opts.forbiddenDisplays.length ? opts.forbiddenDisplays.join(", ") : "(없음)"}

선택 금지(최근 14일 이메일 성구):
${opts.recentEmailDisplays.length ? opts.recentEmailDisplays.join(", ") : "(없음)"}

위 기록의 주제·감정과 닿되 아직 머물지 않은 새 본문 하나를 고르세요.`;

  return { system, user };
}

type AiJson = {
  scripture?: {
    code?: string;
    chapter?: number;
    startVerse?: number;
    endVerse?: number;
  };
  theme?: string;
  why?: string;
  background?: string;
};

function extractJsonObject(text: string): AiJson | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as AiJson;
  } catch {
    return null;
  }
}

async function callAiOnce(opts: {
  system: string;
  user: string;
}): Promise<AiJson | null> {
  type Provider = {
    name: string;
    apiKey: string;
    baseURL: string;
    model: string;
  };
  const providers: Provider[] = [];
  const mimoKey = process.env.MIMO_API_KEY?.trim();
  if (mimoKey) {
    providers.push({
      name: "mimo",
      apiKey: mimoKey,
      baseURL: (process.env.MIMO_BASE_URL || "https://api.xiaomimimo.com/v1").replace(
        /\/$/,
        "",
      ),
      model: process.env.MIMO_MODEL || "mimo-v2.5",
    });
  }
  const deepseekKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekKey) {
    providers.push({
      name: "deepseek",
      apiKey: deepseekKey,
      baseURL: (
        process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
      ).replace(/\/$/, ""),
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
    });
  }

  for (const p of providers) {
    try {
      const res = await fetch(`${p.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${p.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: p.model,
          temperature: 0.4,
          ...(p.name === "deepseek"
            ? { max_tokens: 800, thinking: { type: "disabled" } }
            : { max_completion_tokens: 800 }),
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
        }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        choices?: Array<{
          message?: { content?: string; reasoning_content?: string };
        }>;
      };
      const message = data.choices?.[0]?.message;
      const content =
        message?.content?.trim() || message?.reasoning_content?.trim() || "";
      const json = extractJsonObject(content);
      if (json?.scripture?.code) return json;
    } catch {
      // try next provider
    }
  }
  return null;
}

function validateAiRef(
  raw: AiJson,
  forbiddenChapters: Set<string>,
): DailyScriptureResult | null {
  const s = raw.scripture;
  if (!s?.code || !s.chapter || !s.startVerse || !s.endVerse) return null;
  const ref: BibleReference = {
    code: String(s.code).toUpperCase(),
    chapter: Number(s.chapter),
    startVerse: Number(s.startVerse),
    endVerse: Number(s.endVerse),
  };
  if (
    !Number.isFinite(ref.chapter) ||
    !Number.isFinite(ref.startVerse) ||
    !Number.isFinite(ref.endVerse) ||
    ref.endVerse < ref.startVerse ||
    ref.startVerse < 1
  ) {
    return null;
  }
  if (forbiddenChapters.has(chapterKey(ref))) return null;
  if (EXCLUDED_CHAPTERS.has(chapterKey(ref))) return null;
  const passage = getPassageFromRef(ref);
  if (!passage || passage.verses.length === 0) return null;
  return buildResult("ai", ref, {
    background: raw.background?.trim() || getBookIntro(ref.code),
    why: raw.why?.trim(),
    theme: raw.theme?.trim(),
  });
}

/**
 * 사용자 상태에 따라 AI 맞춤 또는 랜덤 성구를 고른다.
 * AI 실패/무효/14일 중복 시 랜덤으로 폴백.
 */
export async function selectDailyScripture(opts: {
  userId: string;
  dateKey: string;
  aiProcessingConsent: boolean;
  entries: EntrySnippet[];
  recentEmailSlugs: string[];
}): Promise<DailyScriptureResult> {
  const recentChapters = recentChapterKeys(opts.recentEmailSlugs);
  const seed = `${opts.userId}:${opts.dateKey}`;

  const canUseAi =
    opts.aiProcessingConsent && opts.entries.length >= 3;

  if (canUseAi) {
    const recorded = collectRecordedRefs(opts.entries);
    const forbiddenChapters = new Set([
      ...recentChapters,
      ...recorded.chapterKeys,
    ]);
    const recentDisplays = opts.recentEmailSlugs.map((slug) => {
      const m = slug.toUpperCase().match(/^([0-9A-Z]{3})-(\d+)-(\d+)(?:-(\d+))?$/);
      if (!m) return slug;
      return toDisplay({
        code: m[1],
        chapter: Number(m[2]),
        startVerse: Number(m[3]),
        endVerse: m[4] ? Number(m[4]) : Number(m[3]),
      });
    });
    const prompt = buildAiPrompt({
      entries: opts.entries,
      forbiddenDisplays: recorded.displays,
      recentEmailDisplays: recentDisplays,
    });
    const ai = await callAiOnce(prompt);
    if (ai) {
      const validated = validateAiRef(ai, forbiddenChapters);
      if (validated) return validated;
    }
  }

  return selectRandomScripture({ seed, excludeChapters: recentChapters });
}

/** 분기 조건 순수 함수 — 테스트용. */
export function shouldUseAiPath(
  aiProcessingConsent: boolean,
  entryCount: number,
): boolean {
  return aiProcessingConsent && entryCount >= 3;
}
