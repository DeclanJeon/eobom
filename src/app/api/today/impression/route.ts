import { NextResponse } from "next/server";
import { z } from "zod";
import { getOptionalUser } from "@/lib/session";
import { parseJsonBody } from "@/lib/api-schemas";
import { logEvent } from "@/lib/events";
import { recordMemoryExposure } from "@/lib/memory-exposure";
import { toKstDateKey } from "@/lib/kst";
/**
 * B4: 서버 컴포넌트 렌더 금지 — 클라이언트 mount → 이 라우트 호출.
 * 멱등: 클라이언트가 sessionStorage 키(userId:surface:dateKey:cardKey)로 세션당 1회 보장.
 * 서버는 중복을 허용하되 meta에 cardKey·surface만 (원문 금지, C8).
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
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    // 계측 실패가 흐름을 깨지 않게 (B4: 비핵심 이벤트)
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
