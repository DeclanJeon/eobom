import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody, reviewCreateSchema } from "@/lib/api-schemas";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";
import { generateReviewWithMimo } from "@/lib/mimo";
import { finalizeReviewRereadScriptures } from "@/lib/reread-scriptures";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedBody,
} from "@/lib/rate-limit";
import {
  consentAiDeniedBody,
  getUserPreferenceFlags,
} from "@/lib/user-preferences";

const MIN_ENTRIES = 3;

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const reports = await db.reviewReport.findMany({
    where: { userId: auth.user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    reports: reports.map((r) => ({
      ...r,
      includedEntryIds: parseJsonArray(r.includedEntryIds),
      excludedEntryIds: parseJsonArray(r.excludedEntryIds),
      structuredOutput: JSON.parse(r.structuredOutput),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const flags = await getUserPreferenceFlags(user.id);
  if (!flags.aiProcessingConsent) {
    return NextResponse.json(consentAiDeniedBody(), { status: 403 });
  }

  const limited = checkRateLimit(`reviews:create:${user.id}`, RATE_LIMITS.reviewsCreate);
  if (!limited.ok) {
    return NextResponse.json(rateLimitedBody(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  const parsed = await parseJsonBody(request, reviewCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const excluded = new Set(body.excludedEntryIds ?? []);

  // 전체 기록에서 회고 (기간 제거)
  const entries = await db.reflectionEntry.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { entryDate: "asc" },
    take: 100,
  });

  const included = entries.filter((e) => !excluded.has(e.id));
  if (included.length < MIN_ENTRIES) {
    return NextResponse.json(
      { error: `회고를 만들기에는 기록이 부족합니다. (필요 ${MIN_ENTRIES}개, 현재 ${included.length}개)` },
      { status: 400 },
    );
  }

  const periodStart = included[0].entryDate;
  const periodEnd = included[included.length - 1].entryDate;

  const mapped = included.map((e) => ({
    id: e.id,
    entryDate: e.entryDate.toISOString(),
    title: e.title,
    scriptureRefs: parseJsonArray(e.scriptureRefs),
    scriptureExcerpt: e.scriptureExcerpt,
    reflectionBody: e.reflectionBody,
    gratitude: e.gratitude,
    question: e.question,
    prayer: e.prayer,
    actionStep: e.actionStep,
    emotions: parseJsonArray(e.emotions),
    tags: parseJsonArray(e.tags),
  }));

  const { review, modelProvider, modelName } = await generateReviewWithMimo(
    mapped,
    "cumulative",
  );
  const allowed = mapped.flatMap((e) => e.scriptureRefs);
  review.rereadScriptures = finalizeReviewRereadScriptures(
    review.rereadScriptures,
    allowed,
    3,
  );

  const report = await db.reviewReport.create({
    data: {
      userId: user.id,
      periodStart,
      periodEnd,
      reportType: "cumulative",
      includedEntryIds: JSON.stringify(included.map((e) => e.id)),
      excludedEntryIds: JSON.stringify([...excluded]),
      structuredOutput: JSON.stringify(review),
      summary: review.oneSentence,
      modelProvider,
      modelName,
      promptVersion: "eobom-review-v1.2",
      evidences: { create: collectEvidence(review) },
    },
  });

  return NextResponse.json(
    { report: { ...report, structuredOutput: review } },
    { status: 201 },
  );
}

function collectEvidence(review: {
  themes?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
  emotions?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
  questions?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
  scriptureConnections?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
  actionFlow?: Array<{ key: string; evidence?: Array<{ entryId: string; excerpt: string }>; confidence?: string }>;
}) {
  const rows: Array<{ observationKey: string; entryId: string; excerpt: string; confidence: string }> = [];
  for (const group of [review.themes, review.emotions, review.questions, review.scriptureConnections, review.actionFlow]) {
    for (const obs of group ?? []) {
      for (const ev of obs.evidence ?? []) {
        if (!ev.entryId) continue;
        rows.push({
          observationKey: obs.key,
          entryId: ev.entryId,
          excerpt: (ev.excerpt || "").slice(0, 500),
          confidence: obs.confidence || "medium",
        });
      }
    }
  }
  return rows.slice(0, 40);
}
