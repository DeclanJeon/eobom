/**
 * GET /api/story-mirror
 *
 * 사용자의 최신 매칭 결과를 조회한다.
 */

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { getLatestRun } from "@/lib/story-mirror/db";
import { parseJsonArray } from "@/lib/utils";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const run = await getLatestRun(auth.user.id);

  if (!run) {
    return NextResponse.json({
      matches: [],
      lastRefreshedAt: null,
      hasRun: false,
    });
  }

  return NextResponse.json({
    matches: run.matches.map((m) => ({
      id: m.id,
      card: {
        id: m.card.id,
        name: m.card.name,
        workTitle: m.card.work.title,
        workAuthor: m.card.work.author,
        summary: m.card.summary,
        arc: m.card.arc,
        contentWarnings: parseJsonArray(m.card.contentWarnings),
      },
      score: m.internalScore,
      confidence: m.confidence,
      matchReason: m.matchReason,
      narrativeBridge: m.narrativeBridge,
      matchedThemes: parseJsonArray(m.matchThemes),
      matchedEmotions: parseJsonArray(m.matchEmotions),
      evidence: m.evidence.map((e) => ({
        entryId: e.entryId,
        excerpt: e.excerpt,
        relevance: e.relevance,
      })),
      createdAt: m.createdAt.toISOString(),
    })),
    lastRefreshedAt: run.completedAt?.toISOString() ?? run.createdAt.toISOString(),
    hasRun: true,
    corpusVersion: run.corpusVersion,
    matcherVersion: run.matcherVersion,
  });
}
