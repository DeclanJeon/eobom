/**
 * POST /api/story-mirror/runs
 *
 * 새로운 매칭 실행을 생성한다.
 * 기록의 주제·감정을 분석하여 StoryCard와 매칭한다.
 */

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { parseJsonBody } from "@/lib/api-schemas";
import { db } from "@/lib/db";
import { buildUserProfile, entryToProfile } from "@/lib/story-mirror/user-profile";
import { matchPhaseA } from "@/lib/story-mirror/matcher";
import { buildNarrativeBridge } from "@/lib/story-mirror/narrative-bridge";
import { computeInputFingerprint } from "@/lib/story-mirror/cache";
import { listPublishedCards } from "@/lib/story-mirror/db";
import { parseJsonArray } from "@/lib/utils";
import { z } from "zod";

const CORPUS_VERSION = "v1.0";
const MATCHER_VERSION = "phase-a-v1";

const runCreateSchema = z.object({
  entryIds: z.array(z.string()).min(1).max(30).optional(),
  entryLimit: z.number().int().min(1).max(30).optional(),
});

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;

  const parsed = await parseJsonBody(request, runCreateSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  // 1. 사용자 기록 로드
  const entryLimit = body.entryLimit ?? 10;
  const where: Record<string, unknown> = {
    userId: auth.user.id,
    deletedAt: null,
  };
  if (body.entryIds && body.entryIds.length > 0) {
    where.id = { in: body.entryIds };
  }

  const entries = await db.reflectionEntry.findMany({
    where,
    orderBy: { entryDate: "desc" },
    take: entryLimit,
  });

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "매칭할 기록이 없습니다." },
      { status: 400 },
    );
  }

  // 2. 프로파일 생성
  const profileEntries = entries.map(entryToProfile);
  const profile = buildUserProfile(profileEntries);

  if (profile.topThemes.length === 0 && profile.topEmotions.length === 0) {
    return NextResponse.json(
      { error: "기록에서 주제나 감정을 추출할 수 없습니다." },
      { status: 400 },
    );
  }

  // 3. fingerprint 생성 (캐시 확인용)
  const fingerprint = computeInputFingerprint(profileEntries, CORPUS_VERSION, MATCHER_VERSION);

  // 4. 동일 fingerprint의 최근 run 확인
  const existingRun = await db.storyMirrorRun.findFirst({
    where: {
      userId: auth.user.id,
      inputFingerprint: fingerprint,
      corpusVersion: CORPUS_VERSION,
      matcherVersion: MATCHER_VERSION,
      status: "complete",
    },
  });

  if (existingRun) {
    return NextResponse.json({
      runId: existingRun.id,
      cached: true,
      completedAt: existingRun.completedAt?.toISOString(),
    });
  }

  // 5. StoryCard 로드 (published만)
  const cards = await listPublishedCards();
  if (cards.length === 0) {
    return NextResponse.json(
      { error: "Story Mirror 콘텐츠가 준비되지 않았습니다." },
      { status: 503 },
    );
  }

  // 6. 매칭 실행
  const candidates = cards.map((card) => ({
    id: card.id,
    workId: card.workId,
    name: card.name,
    workTitle: card.work.title,
    themes: parseJsonArray(card.themes),
    emotions: parseJsonArray(card.emotions),
    situations: parseJsonArray(card.situations),
    summary: card.summary,
    arc: card.arc,
    contentWarnings: parseJsonArray(card.contentWarnings),
  }));

  const matches = matchPhaseA(profile, candidates);

  // 7. run 생성 + match 저장
  const run = await db.storyMirrorRun.create({
    data: {
      userId: auth.user.id,
      inputFingerprint: fingerprint,
      corpusVersion: CORPUS_VERSION,
      matcherVersion: MATCHER_VERSION,
      consentSnapshot: false,
      status: "complete",
      completedAt: new Date(),
    },
  });

  for (const m of matches) {
    const bridge = buildNarrativeBridge(
      candidates.find((c) => c.id === m.cardId)?.name ?? "",
      candidates.find((c) => c.id === m.cardId)?.workTitle ?? "",
      m.matchedThemes,
      m.matchedEmotions,
      [],
      profile.entryCount,
    );

    const card = cards.find((c) => c.id === m.cardId);

    const match = await db.storyMirrorMatch.create({
      data: {
        runId: run.id,
        cardId: m.cardId,
        internalScore: m.score,
        confidence: m.confidence,
        matchThemes: JSON.stringify(m.matchedThemes),
        matchEmotions: JSON.stringify(m.matchedEmotions),
        matchReason: m.matchReason,
        narrativeBridge: bridge,
        state: "active",
      },
    });

    // evidence 저장 (최근 기록에서 추출) — create 반환 id를 재사용해 추가 조회 제거
    for (const entry of entries.slice(0, 5)) {
      const entryThemes = parseJsonArray(entry.tags);
      const hasOverlap = m.matchedThemes.some((t) =>
        entryThemes.some((et) => et.toLowerCase() === t.toLowerCase()),
      );
      if (hasOverlap) {
        await db.storyMirrorEvidence.create({
          data: {
            matchId: match.id,
            entryId: entry.id,
            excerpt: entry.reflectionBody.slice(0, 200),
            relevance: "supporting",
          },
        });
      }
    }
  }

  return NextResponse.json({
    runId: run.id,
    cached: false,
    matchCount: matches.length,
    completedAt: run.completedAt?.toISOString(),
  });
}
