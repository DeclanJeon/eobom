import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";

/**
 * 조용한 안전망 프롬프트 해제 (DESIGN.md "Continuity & identity policy").
 * "나중에"를 누르면 다시 묻지 않도록 timestamp를 기록한다. 단 한 번 설정되면
 * 되돌릴 수 없다 — 프롬프트는 유저를 괴롭히는 배너가 아니기 때문.
 */
export async function POST() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  await db.user.update({
    where: { id: auth.user.id },
    data: { backupPromptDismissedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
