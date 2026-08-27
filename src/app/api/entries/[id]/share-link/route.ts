import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody, shareLinkCreateSchema } from "@/lib/api-schemas";
import { createShareLink } from "@/lib/share-link";
import { checkRateLimit, RATE_LIMITS, rateLimitedBody } from "@/lib/rate-limit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const limited = await checkRateLimit(`share-link:create:${auth.user.id}`, { limit: 20, windowMs: 60 * 1000 });
  if (!limited.ok) return NextResponse.json(rateLimitedBody(limited.retryAfterSec), { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } });
  const user = auth.user;
  const { id } = await ctx.params;

  const parsed = await parseJsonBody(request, shareLinkCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  try {
    const link = await createShareLink({
      userId: user.id,
      entryId: id,
      selectedSentence: body.selectedSentence,
      scriptureRefs: body.scriptureRefs,
      expiresInDays: body.expiresInDays ?? null,
    });
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성에 실패했습니다.";
    const status = message.includes("찾을 수 없습니다") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
