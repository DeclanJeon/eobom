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
/**
 * 사용자의 최신 완료된 StoryRagRun(연결 포함)을 조회한다.
 */
export async function getLatestRagRun(userId: string) {
  return db.storyRagRun.findFirst({
    where: { userId, status: "complete" },
    orderBy: { createdAt: "desc" },
    include: {
      matches: {
        where: { state: "active" },
        include: { chunk: { include: { work: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * 사용자의 완료된 StoryRagRun 목록(요약 + 연결 수)을 반환한다.
 */
export async function getRagRuns(userId: string, take = 20) {
  const runs = await db.storyRagRun.findMany({
    where: { userId, status: "complete" },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      createdAt: true,
      summary: true,
      corpusVersion: true,
      _count: { select: { matches: { where: { state: "active" } } } },
    },
  });
  return runs.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    summary: r.summary,
    corpusVersion: r.corpusVersion,
    connectionCount: r._count.matches,
  }));
}

/**
 * 특정 StoryRagRun 상세(연결 목록)를 반환한다. 권한 없으면 null.
 */
export async function getRagRunById(userId: string, runId: string) {
  const run = await db.storyRagRun.findFirst({
    where: { id: runId, userId, status: "complete" },
    include: {
      matches: {
        where: { state: "active" },
        include: { chunk: { include: { work: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!run) return null;
  return {
    id: run.id,
    createdAt: run.createdAt,
    summary: run.summary,
    connections: run.matches.map((m) => ({
      chunkId: m.chunkId,
      title: m.chunk.title,
      workTitle: m.chunk.work.title,
      locator: m.chunk.locator,
      connection: m.connection ?? "",
      differentPerspective: m.differentPerspective,
    })),
  };
}
