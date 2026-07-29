/**
 * GET /api/story-mirror/rag/runs
 *
 * 사용자의 완료된 StoryRagRun 목록을 반환한다 (최신순, 요약 + 연결 수).
 */
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { getRagRuns } from "@/lib/story-mirror/db";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const runs = await getRagRuns(auth.user.id);
  return NextResponse.json({ runs });
}
