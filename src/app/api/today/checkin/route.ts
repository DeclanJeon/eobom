import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody } from "@/lib/api-schemas";
import { recordCheckin } from "@/lib/checkin";

/**
 * POST /api/today/checkin — 오늘의 카드 응답 (리액션·한 줄).
 * dateKey는 서버 KST 계산 (클라이언트 값 신뢰 금지, C9).
 * 한 줄 저장 시 quick ReflectionEntry(private 강제) 승격.
 */
const checkinSchema = z.object({
  cardKey: z.string().min(1).max(128),
  reaction: z.enum(["re_read", "still_hold", "changed_view"]).nullable().optional(),
  oneLine: z.string().max(500).nullable().optional(),
  surface: z.string().max(16).optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonBody(request, checkinSchema);
  if (!parsed.ok) return parsed.response;
  try {
    const result = await recordCheckin({
      userId: auth.user.id,
      cardKey: parsed.data.cardKey,
      ...(parsed.data.reaction !== undefined
        ? { reaction: parsed.data.reaction }
        : {}),
      ...(parsed.data.oneLine !== undefined
        ? { oneLine: parsed.data.oneLine }
        : {}),
      ...(parsed.data.surface !== undefined
        ? { surface: parsed.data.surface }
        : {}),
    });
    return NextResponse.json({ checkin: result }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
