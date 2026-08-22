import { NextResponse } from "next/server";
import { checkRateLimit, RATE_LIMITS, rateLimitedBody } from "@/lib/rate-limit";

/** public 참조 API용 공용 rate-limit 헬퍼 — 클라이언트에서 직접 사용하는 API만 */
export async function enforcePublicReferenceRateLimit(request: Request): Promise<NextResponse | null> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = await checkRateLimit(`bibleRef:${ip}`, RATE_LIMITS.bibleReference);
  if (!limited.ok) {
    return NextResponse.json(rateLimitedBody(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }
  return null;
}
