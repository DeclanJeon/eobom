/**
 * Visualization freshness — content fingerprint helpers.
 *
 * Fingerprint hashes visualization INPUTS (latest review + recent entries),
 * never AI imageBrief output. Used for cache hit / stale UI.
 *
 * Design: docs/design/visualization-freshness-v1.md
 */

import { createHash } from "crypto";
import { db } from "@/lib/db";

export const FINGERPRINT_VERSION = 1;
export const FINGERPRINT_ENTRY_LIMIT = 20;

export type VisualizationFreshness = "none" | "fresh" | "stale";

export type VisualizationFingerprintPayload = {
  v: typeof FINGERPRINT_VERSION;
  kind: string;
  periodStart: string;
  reviewId: string | null;
  reviewHash: string | null;
  entryCount: number;
  entries: Array<[string, string]>;
};

export function monthPeriodStart(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function shortHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** Stable JSON for hashing (sorted keys not required — we control shape). */
export function hashFingerprintPayload(
  payload: VisualizationFingerprintPayload,
): string {
  return shortHash(JSON.stringify(payload));
}

export function buildFingerprintPayload(input: {
  kind?: string;
  periodStart: Date;
  review: { id: string; structuredOutput: string } | null;
  entries: Array<{ id: string; updatedAt: Date }>;
  entryCount: number;
}): VisualizationFingerprintPayload {
  return {
    v: FINGERPRINT_VERSION,
    kind: input.kind ?? "summary",
    periodStart: input.periodStart.toISOString(),
    reviewId: input.review?.id ?? null,
    reviewHash: input.review
      ? shortHash(input.review.structuredOutput)
      : null,
    entryCount: input.entryCount,
    entries: input.entries.map((e) => [e.id, e.updatedAt.toISOString()]),
  };
}

export async function computeVisualizationFingerprint(
  userId: string,
  opts?: { kind?: string; now?: Date },
): Promise<string> {
  const kind = opts?.kind ?? "summary";
  const periodStart = monthPeriodStart(opts?.now);

  const [entries, report, entryCount] = await Promise.all([
    db.reflectionEntry.findMany({
      where: { userId, deletedAt: null },
      orderBy: { entryDate: "desc" },
      take: FINGERPRINT_ENTRY_LIMIT,
      select: { id: true, updatedAt: true },
    }),
    db.reviewReport.findFirst({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, structuredOutput: true },
    }),
    db.reflectionEntry.count({
      where: { userId, deletedAt: null },
    }),
  ]);

  const payload = buildFingerprintPayload({
    kind,
    periodStart,
    review: report,
    entries,
    entryCount,
  });
  return hashFingerprintPayload(payload);
}

export function parseVisualizationDataJson(
  dataJson: string | null | undefined,
): Record<string, unknown> {
  if (!dataJson?.trim()) return {};
  try {
    const parsed = JSON.parse(dataJson) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export function getStoredFingerprint(
  dataJson: string | null | undefined,
): string | null {
  const data = parseVisualizationDataJson(dataJson);
  const fp = data.contentFingerprint;
  return typeof fp === "string" && fp.trim() ? fp.trim() : null;
}

export function hasSynthesisInDataJson(
  dataJson: string | null | undefined,
): boolean {
  const data = parseVisualizationDataJson(dataJson);
  return typeof data.synthesis === "string" && Boolean(data.synthesis.trim());
}

export function mergeFingerprintIntoData(
  data: Record<string, unknown>,
  fingerprint: string,
): Record<string, unknown> {
  return {
    ...data,
    contentFingerprint: fingerprint,
    fingerprintVersion: FINGERPRINT_VERSION,
  };
}

export function deriveVisualizationFreshness(args: {
  hasImage: boolean;
  hasSynthesis: boolean;
  storedFingerprint: string | null;
  currentFingerprint: string;
}): VisualizationFreshness {
  if (!args.hasImage) return "none";
  // complete image without synthesis still treated as displayable but stale
  // if fp missing/mismatch; if fp matches and has synthesis → fresh
  if (
    args.hasSynthesis &&
    args.storedFingerprint &&
    args.storedFingerprint === args.currentFingerprint
  ) {
    return "fresh";
  }
  // legacy (no fp) or mismatch → stale; keep image
  return "stale";
}

export function isCacheHit(args: {
  force?: boolean;
  hasImage: boolean;
  hasSynthesis: boolean;
  storedFingerprint: string | null;
  currentFingerprint: string;
}): boolean {
  if (args.force) return false;
  return (
    deriveVisualizationFreshness(args) === "fresh" &&
    Boolean(args.storedFingerprint)
  );
}
