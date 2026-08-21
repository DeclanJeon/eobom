import { NextResponse } from "next/server";
import { z } from "zod";
import { parseJsonBody } from "@/lib/api-schemas";
import { logEvent } from "@/lib/events";
import { checkRateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

/**
 * POST /api/events/landing — 키링 랜딩 계측 (B2·B4).
 * 공개 엔드포인트 (게스트 포함): userId 없이 seatId(키링 단위)로만 기록 — 사람 단위 추적 금지.
 * 서버 컴포넌트 렌더 금지 — 클라이언트 mount → 이 라우트 (세션당 1회, client 멱등).
 * 경량 rate limit: seatId당 1분 30회 (스팸 방지).
 */
const landingSchema = z.object({
  seatId: z.string().min(1).max(64),
});

export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, landingSchema);
  if (!parsed.ok) return parsed.response;
  const seat = await db.journalSeat.findFirst({
    where: { slug: parsed.data.seatId, status: { not: "revoked" } },
    select: { slug: true },
  });
  if (!seat) {
    return NextResponse.json({ error: "Unknown keyring" }, { status: 404 });
  }
  const seatId = seat.slug;
  const rl = await checkRateLimit(`landing:${seatId}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  await logEvent({
    seatId,
    eventType: "landing_seen",
    entrySource: "unknown", // NFC/QR/북마크 구분 불가 (R-B2) — 키링 경로 재방문률 명칭 사용
    meta: { seatId },
    fireAndForget: true,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
