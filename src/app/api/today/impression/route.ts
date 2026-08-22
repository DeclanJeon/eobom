import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalUser } from "@/lib/session";
import { parseJsonBody } from "@/lib/api-schemas";
import { logEvent } from "@/lib/events";
import { recordMemoryExposure } from "@/lib/memory-exposure";
import { toKstDateKey } from "@/lib/kst";
import { GUEST_ID_COOKIE, GUEST_ID_MAX_AGE, newGuestId } from "@/lib/guest-id";

/**
 * B4: 서버 컴포넌트 렌더 금지 — 클라이언트 mount → 이 라우트 호출.
 * 멱등: 클라이언트가 sessionStorage 키(userId:surface:dateKey:cardKey)로 세션당 1회 보장.
 * 서버는 중복을 허용하되 meta에 cardKey·surface만 (원문 금지, C8).
 * 게스트(비로그인) 방문 시 게스트 식별 쿠키(eobom_guest_id)를 발급한다 — 신규/재방문 구분용.
 */
const impressionSchema = z.object({
  cardKey: z.string().min(1).max(128),
  surface: z.string().max(16),
});

export async function POST(request: Request) {
  const user = await getOptionalUser();
  const parsed = await parseJsonBody(request, impressionSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const publicSurface =
      parsed.data.surface === "guest" ||
      parsed.data.surface === "keyring_guest";
    if (!publicSurface && user?.id && parsed.data.cardKey.startsWith("memory:")) {
      const sourceEntryId = parsed.data.cardKey.slice("memory:".length);
      if (sourceEntryId) {
        await recordMemoryExposure({
          userId: user.id,
          sourceEntryId,
          surfaceDateKey: toKstDateKey(new Date()),
        });
      }
    }

    await logEvent({
      userId: publicSurface ? null : (user?.id ?? null),
      eventType: "card_impression",
      meta: {
        cardKey: parsed.data.cardKey,
        surface: parsed.data.surface,
      },
      fireAndForget: true,
    });

    const response = NextResponse.json({ ok: true }, { status: 200 });
    // 게스트 식별 쿠키 — 로그인 안 한 방문자의 신규/재방문 구분용 (없으면 발급)
    if (!user) {
      const jar = request.headers.get("cookie") ?? "";
      if (!jar.includes(`${GUEST_ID_COOKIE}=`)) {
        response.cookies.set(GUEST_ID_COOKIE, newGuestId(), {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
          path: "/",
          maxAge: GUEST_ID_MAX_AGE,
        });
      }
    }
    return response;
  } catch (error) {
    // 계측 실패가 흐름을 깨지 않게 (B4: 비핵심 이벤트)
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
