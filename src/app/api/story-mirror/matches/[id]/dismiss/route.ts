/**
 * POST /api/story-mirror/matches/[id]/dismiss
 *
 * 특정 매칭 결과를 숨긴다.
 */

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const match = await db.storyMirrorMatch.findUnique({
    where: { id },
    include: { run: true },
  });

  if (!match || match.run.userId !== auth.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.storyMirrorMatch.update({
    where: { id },
    data: { state: "dismissed" },
  });

  return NextResponse.json({ ok: true });
}
