import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { companionMatchRequestSchema, parseJsonBody } from "@/lib/api-schemas";
import { runCompanionMatch, listCompanionCandidates } from "@/lib/companions";
import { checkRateLimit, rateLimitedBody } from "@/lib/rate-limit";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`companions:read:${auth.user.id}`, { limit: 30, windowMs: 60_000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429 });
  return NextResponse.json({
    candidates: await listCompanionCandidates(auth.user.id),
  });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`companions:match:${auth.user.id}`, { limit: 5, windowMs: 60 * 60_000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429 });
  const daily = await checkRateLimit(`companions:match:daily:${auth.user.id}`, { limit: 20, windowMs: 24 * 60 * 60_000 });
  if (!daily.ok) return NextResponse.json(rateLimitedBody(daily.retryAfterSec), { status: 429 });
  const parsed = await parseJsonBody(request, companionMatchRequestSchema);
  if (!parsed.ok) return parsed.response;
  return NextResponse.json({
    ...(await runCompanionMatch(auth.user.id, parsed.data.scopeKey ?? "private")),
  });
}
