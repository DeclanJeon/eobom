/**
 * GET /api/story-mirror/runs/[id]
 *
 * 단일 run 조회.
 */

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const run = await db.storyMirrorRun.findFirst({
    where: { id, userId: auth.user.id },
    include: {
      matches: {
        include: {
          card: { include: { work: true } },
          evidence: true,
        },
        orderBy: { internalScore: "desc" },
      },
    },
  });

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: run.id,
    status: run.status,
    corpusVersion: run.corpusVersion,
    matcherVersion: run.matcherVersion,
    createdAt: run.createdAt.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    matches: run.matches?.map((m) => ({
      id: m.id,
      card: {
        id: m.card.id,
        name: m.card.name,
        workTitle: m.card.work.title,
        summary: m.card.summary,
        contentWarnings: parseJsonArray(m.card.contentWarnings),
      },
      score: m.internalScore,
      confidence: m.confidence,
      matchReason: m.matchReason,
      narrativeBridge: m.narrativeBridge,
      matchedThemes: parseJsonArray(m.matchThemes),
      matchedEmotions: parseJsonArray(m.matchEmotions),
    })) ?? [],
  });
}
