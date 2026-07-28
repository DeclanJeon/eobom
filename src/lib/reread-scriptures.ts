import {
  formatBibleReferenceKey,
  parseBibleReferences,
  toDisplay,
  toSlug,
} from "@/lib/bible";
import { scrubMirrorText } from "@/lib/content-scrub";


const DEFAULT_MAX = 3;
const DEFAULT_STALE_DAYS = 90;

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

export type RecentScriptureFallback = {
  ref: string;
  reason: string;
  slug?: string;
  display?: string;
  entryId: string;
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

function daysBetween(later: Date, earlier: Date): number {
  const ms = later.getTime() - earlier.getTime();
  return ms / (1000 * 60 * 60 * 24);
}

/**
 * Home should not present a review as "current" when either createdAt
 * or periodEnd is older than maxAgeDays (default 90).
 * Matches design: hide when either timestamp exceeds the freshness window.
 */
export function isReviewStaleForHome(
  report: { createdAt: Date; periodEnd: Date },
  now: Date = new Date(),
  maxAgeDays: number = DEFAULT_STALE_DAYS,
): boolean {
  const created = report.createdAt instanceof Date ? report.createdAt : new Date(report.createdAt);
  const periodEnd =
    report.periodEnd instanceof Date ? report.periodEnd : new Date(report.periodEnd);
  return (
    daysBetween(now, created) > maxAgeDays || daysBetween(now, periodEnd) > maxAgeDays
  );
}

/**
 * Non-AI fallback: re-surface scripture refs the user already recorded.
 */
export function pickRecentScriptureFallback(
  entries: Array<{
    id: string;
    entryDate: Date;
    title?: string | null;
    scriptureRefs: string[];
  }>,
  options?: { max?: number; now?: Date; maxAgeDays?: number },
): RecentScriptureFallback[] {
  const max = options?.max ?? 2;
  const now = options?.now ?? new Date();
  const maxAgeDays = options?.maxAgeDays ?? DEFAULT_STALE_DAYS;
  const seen = new Set<string>();
  const out: RecentScriptureFallback[] = [];

  const sorted = [...entries].sort(
    (a, b) => b.entryDate.getTime() - a.entryDate.getTime(),
  );

  for (const entry of sorted) {
    if (out.length >= max) break;
    if (daysBetween(now, entry.entryDate) > maxAgeDays) continue;

    for (const raw of entry.scriptureRefs) {
      if (out.length >= max) break;
      if (typeof raw !== "string") continue;
      const parsed = parseFirstRef(raw);
      if (!parsed) continue;
      const slug = toSlug(parsed);
      if (seen.has(slug)) continue;
      seen.add(slug);

      const display = toDisplay(parsed);
      const title = entry.title?.trim();
      const dateLabel = entry.entryDate.toISOString().slice(0, 10);
      out.push({
        ref: display,
        display,
        slug,
        entryId: entry.id,
        reason: title
          ? `${dateLabel} 기록 「${title}」에 남긴 본문입니다.`
          : `${dateLabel} 기록에 남긴 본문입니다.`,
      });
    }
  }

  return out;
}

/** Parse rereadScriptures from a stored review JSON string (never throws). */
export function parseStructuredRereadScriptures(structuredOutput: string): unknown {
  try {
    const parsed = JSON.parse(structuredOutput) as { rereadScriptures?: unknown };
    return parsed?.rereadScriptures ?? [];
  } catch {
    return [];
  }
}

export type HomeRereadSource = "review" | "fallback" | "none";

export type HomeRereadSelection = {
  source: HomeRereadSource;
  items: Array<RereadScripture | RecentScriptureFallback>;
};

/**
 * Today-home selection: fresh review ∩ allowedRefs first, else recent entry fallback.
 * Pure — no DB / AI. Callers supply already-loaded allowedRefs and entries.
 */
export function selectHomeRereadScriptures(input: {
  report: { createdAt: Date; periodEnd: Date; structuredOutput: string } | null | undefined;
  /** scriptureRefs from entries included in the review */
  allowedRefs?: string[];
  fallbackEntries: Array<{
    id: string;
    entryDate: Date;
    title?: string | null;
    scriptureRefs: string[];
  }>;
  now?: Date;
  max?: number;
}): HomeRereadSelection {
  const max = input.max ?? 2;
  const now = input.now ?? new Date();
  const report = input.report;

  if (report && !isReviewStaleForHome(report, now)) {
    const fromReview = normalizeRereadScriptures(
      parseStructuredRereadScriptures(report.structuredOutput),
      {
        allowedRefs: input.allowedRefs ?? [],
        max,
      },
    );
    if (fromReview.length) {
      return { source: "review", items: fromReview };
    }
  }

  const fallback = pickRecentScriptureFallback(input.fallbackEntries, {
    max,
    now,
  });
  if (fallback.length) {
    return { source: "fallback", items: fallback };
  }
  return { source: "none", items: [] };
}

/** Persist-path helper used by reviews POST (and tests). */
export function finalizeReviewRereadScriptures(
  rereadScriptures: unknown,
  allowedRefs: string[],
  max = DEFAULT_MAX,
): RereadScripture[] {
  return normalizeRereadScriptures(rereadScriptures, { allowedRefs, max });
}
