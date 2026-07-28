import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody, togetherCreateSchema } from "@/lib/api-schemas";
import { db } from "@/lib/db";
import {
  generateTopicTagsWithMimo,
  sanitizeTopicTags,
} from "@/lib/together-tags";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedBody,
} from "@/lib/rate-limit";
import {
  SAFETY_BLOCKED,
  SAFETY_BLOCKED_MESSAGE,
  scanSharedReflectionSafety,
  shouldPersistSharedReflection,
} from "@/lib/together-safety";
import {
  CONSENT_AI_TAGS_MESSAGE,
  consentAiDeniedBody,
  consentCommunityDeniedBody,
  getUserPreferenceFlags,
} from "@/lib/user-preferences";
import { parseJsonArray, toJsonArray } from "@/lib/utils";

export async function GET() {
  const items = await db.sharedReflection.findMany({
    where: {
      visibility: "public",
      withdrawnAt: null,
      deletedAt: null,
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: {
      reactions: true,
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      publicBody: item.publicBody,
      scriptureRefs: parseJsonArray(item.scriptureRefs),
      topicTags: parseJsonArray(item.topicTags),
      pseudonym: item.pseudonym || "익명의 순례자",
      publishedAt: item.publishedAt,
      reactions: summarizeReactions(item.reactions),
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const flags = await getUserPreferenceFlags(user.id);
  if (!flags.communityEnabled) {
    return NextResponse.json(consentCommunityDeniedBody(), { status: 403 });
  }

  const limited = checkRateLimit(
    `together:create:${user.id}`,
    RATE_LIMITS.togetherCreate,
  );
  if (!limited.ok) {
    return NextResponse.json(rateLimitedBody(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  const parsed = await parseJsonBody(request, togetherCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const publicBody = body.publicBody?.trim() || "";
  if (publicBody.length < 20) {
    return NextResponse.json(
      { error: "공유 본문은 20자 이상 작성해 주세요." },
      { status: 400 },
    );
  }

  const scriptureRefs = (body.scriptureRefs ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  if (body.sourceEntryId) {
    const entry = await db.reflectionEntry.findFirst({
      where: {
        id: body.sourceEntryId,
        userId: user.id,
        deletedAt: null,
      },
    });
    if (!entry) {
      return NextResponse.json(
        { error: "원문 기록을 찾을 수 없습니다." },
        { status: 404 },
      );
    }
  }

  const safety = scanSharedReflectionSafety(publicBody);
  if (!shouldPersistSharedReflection(safety)) {
    return NextResponse.json(
      {
        error: SAFETY_BLOCKED_MESSAGE,
        safety,
        code: SAFETY_BLOCKED,
      },
      { status: 400 },
    );
  }

  let topicTags = sanitizeTopicTags(body.topicTags, 5);
  if (topicTags.length === 0) {
    if (!flags.aiProcessingConsent) {
      return NextResponse.json(consentAiDeniedBody(CONSENT_AI_TAGS_MESSAGE), {
        status: 403,
      });
    }
    const generated = await generateTopicTagsWithMimo({
      publicBody,
      scriptureRefs,
      limit: 5,
    });
    topicTags = generated.tags;
  }

  const created = await db.sharedReflection.create({
    data: {
      ownerUserId: user.id,
      sourceEntryId: body.sourceEntryId || null,
      publicBody,
      scriptureRefs: toJsonArray(scriptureRefs),
      topicTags: toJsonArray(topicTags),
      pseudonym: body.pseudonym?.trim() || "익명의 순례자",
      safetyScanResult: JSON.stringify(safety),
      visibility: "public",
    },
  });

  return NextResponse.json(
    {
      item: {
        ...created,
        scriptureRefs,
        topicTags,
      },
    },
    { status: 201 },
  );
}

function summarizeReactions(reactions: Array<{ reactionType: string }>) {
  const counts: Record<string, number> = {};
  for (const r of reactions) {
    counts[r.reactionType] = (counts[r.reactionType] || 0) + 1;
  }
  return counts;
}
