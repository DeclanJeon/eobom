import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { companionSafetySchema, parseJsonBody } from "@/lib/api-schemas";
import { recordCompanionSafetyEvent } from "@/lib/companions";
import { checkRateLimit, rateLimitedBody } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`companions:safety:${auth.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429 });
  const daily = await checkRateLimit(`companions:safety:daily:${auth.user.id}`, { limit: 30, windowMs: 24 * 60 * 60_000 });
  if (!daily.ok) return NextResponse.json(rateLimitedBody(daily.retryAfterSec), { status: 429 });
  const parsed = await parseJsonBody(request, companionSafetySchema);
  if (!parsed.ok) return parsed.response;
  try {
    const event = await recordCompanionSafetyEvent(auth.user.id, parsed.data);
    return NextResponse.json({ event });
  } catch (error) {
    const message = error instanceof Error ? error.message : "안전 처리를 저장하지 못했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
