import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { companionDecisionSchema, parseJsonBody } from "@/lib/api-schemas";
import { decideCompanionCandidate } from "@/lib/companions";
import { checkRateLimit, rateLimitedBody } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`companions:decision:${auth.user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429 });
  const daily = await checkRateLimit(`companions:decision:daily:${auth.user.id}`, { limit: 50, windowMs: 24 * 60 * 60_000 });
  if (!daily.ok) return NextResponse.json(rateLimitedBody(daily.retryAfterSec), { status: 429 });
  const parsed = await parseJsonBody(request, companionDecisionSchema);
  if (!parsed.ok) return parsed.response;
  const { id } = await params;
  try {
    const result = await decideCompanionCandidate(auth.user.id, id, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "동행 결정을 저장하지 못했어요.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
