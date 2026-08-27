/**
 * POST /api/reviews/[id]/feedback
 *
 * 회고 관찰별 피드백을 저장한다.
 * StoryMirrorFeedback 모델을 재사용한다.
 */

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody } from "@/lib/api-schemas";
import { db } from "@/lib/db";
import { checkRateLimit, RATE_LIMITS, rateLimitedBody } from "@/lib/rate-limit";
import { z } from "zod";

const feedbackSchema = z.object({
  observationKey: z.string().max(64),
  type: z.enum(["helpful", "inaccurate", "context_different", "exclude"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`reviews:feedback:${auth.user.id}`, { limit: 30, windowMs: 60 * 1000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  const { id } = await params;
  const report = await db.reviewReport.findFirst({
    where: { id, userId: auth.user.id, deletedAt: null },
  });
  if (!report) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, feedbackSchema);
  if (!parsed.ok) return parsed.response;

  // 피드백을 structuredOutput에 직접 저장
  const review = JSON.parse(report.structuredOutput) as Record<string, unknown>;
  const feedbackKey = `_feedback_${parsed.data.observationKey}`;
  const existing = (review[feedbackKey] as string[]) ?? [];
  const feedbackType = parsed.data.type;

  if (existing.includes(feedbackType)) {
    // 이미 있으면 제거 (토글)
    const updated = existing.filter((f) => f !== feedbackType);
    review[feedbackKey] = updated;
  } else {
    review[feedbackKey] = [...existing, feedbackType];
  }

  await db.reviewReport.update({
    where: { id },
    data: { structuredOutput: JSON.stringify(review) },
  });

  return NextResponse.json({ ok: true, feedback: review[feedbackKey] });
}
