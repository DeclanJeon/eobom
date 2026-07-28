import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody, togetherTagsSchema } from "@/lib/api-schemas";
import { generateTopicTagsWithMimo } from "@/lib/together-tags";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedBody,
} from "@/lib/rate-limit";
import {
  CONSENT_AI_TAGS_MESSAGE,
  consentAiDeniedBody,
  getUserPreferenceFlags,
} from "@/lib/user-preferences";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const flags = await getUserPreferenceFlags(user.id);
  if (!flags.aiProcessingConsent) {
    return NextResponse.json(consentAiDeniedBody(CONSENT_AI_TAGS_MESSAGE), {
      status: 403,
    });
  }

  const limited = checkRateLimit(
    `together:tags:${user.id}`,
    RATE_LIMITS.togetherTags,
  );
  if (!limited.ok) {
    return NextResponse.json(rateLimitedBody(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  const parsed = await parseJsonBody(request, togetherTagsSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const publicBody = body.publicBody?.trim() || "";
  if (publicBody.length < 12) {
    return NextResponse.json(
      { error: "태그 제안을 위해 본문을 조금 더 작성해 주세요." },
      { status: 400 },
    );
  }

  const scriptureRefs = (body.scriptureRefs ?? []).slice(0, 5);

  const result = await generateTopicTagsWithMimo({
    publicBody,
    scriptureRefs,
    limit: 5,
  });

  return NextResponse.json(result);
}
