/**
 * GET /api/story-mirror/rag/runs/[id]
 *
 * 특정 StoryRagRun의 상세(연결 목록)를 반환한다.
 * 권한 없음/누락 → 404.
 */
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { getRagRunById } from "@/lib/story-mirror/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const run = await getRagRunById(auth.user.id, id);
  if (!run) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ run });
}
