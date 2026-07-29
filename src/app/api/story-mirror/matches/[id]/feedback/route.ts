/**
 * POST /api/story-mirror/matches/[id]/feedback
 *
 * 매칭 결과에 대한 피드백을 저장한다.
 */

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody } from "@/lib/api-schemas";
import { db } from "@/lib/db";
import { z } from "zod";

const feedbackSchema = z.object({
  type: z.enum(["helpful", "inaccurate", "unrelated", "sensitive", "hide"]),
});

export async function POST(
  request: Request,
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

  const parsed = await parseJsonBody(request, feedbackSchema);
  if (!parsed.ok) return parsed.response;

  await db.storyMirrorFeedback.upsert({
    where: {
      matchId_userId_type: {
        matchId: id,
        userId: auth.user.id,
        type: parsed.data.type,
      },
    },
    create: {
      matchId: id,
      userId: auth.user.id,
      type: parsed.data.type,
    },
    update: {
      type: parsed.data.type,
    },
  });

  // hide 피드백이면 match 상태도 변경
  if (parsed.data.type === "hide") {
    await db.storyMirrorMatch.update({
      where: { id },
      data: { state: "dismissed" },
    });
  }

  return NextResponse.json({ ok: true });
}
