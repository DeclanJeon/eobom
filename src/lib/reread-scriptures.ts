import {
  formatBibleReferenceKey,
  parseBibleReferences,
  toDisplay,
  toSlug,
} from "@/lib/bible";
import { scrubMirrorText } from "@/lib/content-scrub";
import type { ScriptureReading } from "@/lib/mimo";


const DEFAULT_MAX = 3;

export type RereadScripture = {
  ref: string;
  reason: string;
  slug?: string;
  display?: string;
  startVerse?: number;
  endVerse?: number;
  evidenceEntryIds?: string[];
  openQuestion?: string;
};

export type NormalizeRereadOptions = {
  /** Entry scriptureRefs (display or raw). When set, only intersecting refs pass. */
  allowedRefs?: string[];
  max?: number;
  now?: Date;
};

function scrubReason(text: string): string {
  return scrubMirrorText(text, {
    includeScriptureExtras: true,
    collapseWhitespace: true,
  });
}

function parseFirstRef(input: string) {
  return parseBibleReferences(input)[0] ?? null;
}

function buildAllowedKeys(allowedRefs?: string[]): Set<string> | null {
  if (!allowedRefs) return null;
  const keys = new Set<string>();
  for (const raw of allowedRefs) {
    if (typeof raw !== "string") continue;
    const ref = parseFirstRef(raw);
    if (ref) keys.add(formatBibleReferenceKey(ref));
  }
  return keys;
}

function cleanEvidenceIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = value
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length ? [...new Set(ids)].slice(0, 8) : undefined;
}

function cleanOpenQuestion(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const q = scrubReason(value);
  return q || undefined;
}

/**
 * Normalize AI/legacy rereadScriptures into safe, parseable re-visit items.
 * Idempotent: already-normalized items pass through with the same constraints.
 */
export function normalizeRereadScriptures(
  input: unknown,
  options?: NormalizeRereadOptions,
): RereadScripture[] {
  if (!Array.isArray(input)) return [];

  const max = options?.max ?? DEFAULT_MAX;
  const allowedKeys = buildAllowedKeys(options?.allowedRefs);
  const seen = new Set<string>();
  const out: RereadScripture[] = [];

  for (const item of input) {
    if (out.length >= max) break;
    if (!item || typeof item !== "object") continue;

    const raw = item as Record<string, unknown>;
    const refRaw = typeof raw.ref === "string" ? raw.ref.trim() : "";
    const reasonRaw = typeof raw.reason === "string" ? raw.reason.trim() : "";
    if (!refRaw || !reasonRaw) continue;

    const reason = scrubReason(reasonRaw);
    if (!reason) continue;

    const parsed = parseFirstRef(refRaw);
    if (!parsed) continue;

    const key = formatBibleReferenceKey(parsed);
    if (allowedKeys && !allowedKeys.has(key)) continue;

    const slug = toSlug(parsed);
    if (seen.has(slug)) continue;
    seen.add(slug);

    const display = toDisplay(parsed);
    const next: RereadScripture = {
      ref: display,
      reason,
      slug,
      display,
      startVerse: parsed.startVerse,
      endVerse: parsed.endVerse,
    };

    const evidenceEntryIds = cleanEvidenceIds(raw.evidenceEntryIds);
    if (evidenceEntryIds) next.evidenceEntryIds = evidenceEntryIds;

    const openQuestion = cleanOpenQuestion(raw.openQuestion);
    if (openQuestion) next.openQuestion = openQuestion;

    out.push(next);
  }

  return out;
}

/** Persist-path helper used by reviews POST (and tests). */
export function finalizeReviewRereadScriptures(
  rereadScriptures: unknown,
  allowedRefs: string[],
  max = DEFAULT_MAX,
): RereadScripture[] {
  return normalizeRereadScriptures(rereadScriptures, { allowedRefs, max });
}

/**
 * Persist-path helper for scriptureReadings (신규 추천 성구):
 * 사용자가 이미 기록한 본문(usedRefs)과 겹치는 항목을 제거한다.
 * scriptureReadings는 재방문 제안이 아니라 주제 기반 새 본문이어야 하므로,
 * 재사용이 섞여 들어오면 잘라낸다.
 */
export function excludeUsedScriptureReadings(
  readings:
    | Array<{ ref: string; reason?: string; focus?: string }>
    | undefined
    | null,
  usedRefs: string[],
  max = DEFAULT_MAX,
): ScriptureReading[] {
  if (!Array.isArray(readings)) return [];
  // 장 단위 비교: 이미 기록한 본문과 같은 장이면 재사용으로 보고 제거한다.
  const usedChapterKeys = new Set<string>();
  for (const raw of usedRefs) {
    const parsed = parseFirstRef(raw);
    if (parsed) usedChapterKeys.add(`${parsed.code}-${parsed.chapter}`);
  }
  const seen = new Set<string>();
  const out: ScriptureReading[] = [];

  for (const item of readings) {
    if (out.length >= max) break;
    if (!item || typeof item !== "object") continue;

    const raw = item as Record<string, unknown>;
    const refRaw = typeof raw.ref === "string" ? raw.ref.trim() : "";
    if (!refRaw) continue;

    const parsed = parseFirstRef(refRaw);
    if (!parsed) continue;

    if (usedChapterKeys.has(`${parsed.code}-${parsed.chapter}`)) continue;

    const slug = toSlug(parsed);
    if (seen.has(slug)) continue;
    seen.add(slug);

    const reasonRaw =
      typeof raw.reason === "string" ? scrubReason(raw.reason) : "";
    const focusRaw =
      typeof raw.focus === "string" ? scrubReason(raw.focus) : "";

    out.push({
      ref: toDisplay(parsed),
      reason: reasonRaw || "이 시기에 다시 머물 만한 본문입니다.",
      focus: focusRaw || "문맥 전체를 읽고, 현재 자신의 상황과 연결해 보세요.",
    });
  }

  return out;
}
