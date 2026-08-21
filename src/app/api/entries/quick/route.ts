import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { createQuickEntry, type QuickEntryInput } from "@/lib/entries";
import { parseJsonBody, quickEntrySchema } from "@/lib/api-schemas";

/**
 * POST /api/entries/quick — 카드 한 줄 → quick 기록 승격 (GATE-1).
 * shareVisibility는 서버에서 private으로 강제된다 (클라이언트 입력 무시).
 * quick 저장만으로는 Together에 게시되지 않는다 (syncEntryShare 미호출).
 */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const parsed = await parseJsonBody(request, quickEntrySchema);
  if (!parsed.ok) return parsed.response;
  try {
    // zod의 optional display는 normalizeBindings가 보완하므로 형태 캐스팅 (검증은 createQuickEntry 내부)
    const entry = await createQuickEntry(auth.user.id, parsed.data as QuickEntryInput);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "저장에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
