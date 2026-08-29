import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { companionMessageSchema, parseJsonBody } from "@/lib/api-schemas";
import { sendCompanionMessage, listCompanionMessages } from "@/lib/companions";
import { checkRateLimit, rateLimitedBody } from "@/lib/rate-limit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`companions:messages:read:${auth.user.id}`, { limit: 60, windowMs: 60_000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429 });
  try {
    return NextResponse.json({ messages: await listCompanionMessages(auth.user.id, (await params).id) });
  } catch {
    return NextResponse.json({ error: "연결된 대화를 찾을 수 없습니다." }, { status: 404 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`companions:messages:send:${auth.user.id}`, { limit: 30, windowMs: 60_000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429 });
  const daily = await checkRateLimit(`companions:messages:daily:${auth.user.id}`, { limit: 100, windowMs: 24 * 60 * 60_000 });
  if (!daily.ok) return NextResponse.json(rateLimitedBody(daily.retryAfterSec), { status: 429 });
  const parsed = await parseJsonBody(request, companionMessageSchema);
  if (!parsed.ok) return parsed.response;
  try {
    return NextResponse.json({
      message: await sendCompanionMessage(auth.user.id, (await params).id, parsed.data.body),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "메시지를 보낼 수 없습니다." },
      { status: 400 },
    );
  }
}
