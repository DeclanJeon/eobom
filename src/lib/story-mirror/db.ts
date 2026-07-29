/**
 * Story Mirror — DB helpers
 *
 * Story Mirror 관련 DB 쿼리를 캡슐화한다.
 */

import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";

/**
 * 승인된(published) StoryCard 목록을 반환한다.
 */
export async function listPublishedCards(opts: {
  locale?: string;
  workId?: string;
  limit?: number;
} = {}) {
  const where: Record<string, unknown> = {
    reviewStatus: "published",
  };
  if (opts.locale) where.locale = opts.locale;
  if (opts.workId) where.workId = opts.workId;

  return db.storyCard.findMany({
    where,
    include: { work: true },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 200,
  });
}

/**
 * 단일 StoryCard를 상세 포함하여 조회한다.
 */
export async function getCardDetail(cardId: string) {
  return db.storyCard.findUnique({
    where: { id: cardId },
    include: {
      work: true,
      passages: true,
    },
  });
}

/**
 * 사용자의 최신 StoryMirrorRun과活跃 매칭을 조회한다.
 */
export async function getLatestRun(userId: string) {
  return db.storyMirrorRun.findFirst({
    where: {
      userId,
      status: "complete",
    },
    orderBy: { createdAt: "desc" },
    include: {
      matches: {
        where: { state: "active" },
        include: {
          card: { include: { work: true } },
          evidence: true,
        },
        orderBy: { internalScore: "desc" },
        take: 5,
      },
    },
  });
}

/**
 * 특정 run의 매칭 목록을 조회한다.
 */
export async function getRunMatches(runId: string, userId: string) {
  const run = await db.storyMirrorRun.findFirst({
    where: { id: runId, userId },
  });
  if (!run) return null;

  return db.storyMirrorMatch.findMany({
    where: { runId },
    include: {
      card: { include: { work: true } },
      evidence: true,
    },
    orderBy: { internalScore: "desc" },
  });
}
