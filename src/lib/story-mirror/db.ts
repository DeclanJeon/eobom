/**
 * Story Mirror — DB helpers
 *
 * Story Mirror 관련 DB 쿼리를 캡슐화한다.
 */

import { db } from "@/lib/db";
import { normalizeReviewForDisplay } from "@/lib/review-display";
import type { StructuredReview } from "@/lib/mimo";
import { parseJsonArray } from "@/lib/utils";
import {
  buildStoryDetailHref,
  buildStoryVisualId,
  toReviewStoryItems,
  type StoryCorpusCandidate,
  type StoryMirrorItem,
} from "@/lib/story-mirror/story-links";
import type { StoryCard, StoryChunk, StoryPassage, StoryWork } from "@prisma/client";

export type StoryCardDetail = StoryCard & {
  work: StoryWork;
  passages: StoryPassage[];
};

export type StoryChunkDetail = StoryChunk & {
  work: StoryWork;
};



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
export async function getCardDetail(
  cardId: string,
): Promise<StoryCardDetail | null> {
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
        where: {
          state: "active",
          connection: { not: null },
        },
        include: { chunk: { include: { work: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

/**
 * 사용자의 최신 회고에서 이야기 거울 재료를 가져온다.
 *
 * - storyConnections: 회고 생성 시 AI가 연결한 고전·성경 속 닮은 이야기
 * - seed: 회고 본문을 압축한 텍스트 (RAG 연결의 입력값)
 *
 * 회고가 없거나, 연결할 내용(이야기·주제·감정)이 전혀 없으면 null을 반환한다.
 * storyConnections가 비어 있어도 주제·감정 시드가 있으면 반환하며,
 * 이 경우 연결 탭에서 회고 내용을 바탕으로 RAG 연결을 자동 생성한다.
 */
export async function getLatestReviewStoryMirror(userId: string) {
  const report = await db.reviewReport.findFirst({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!report) return null;

  let parsed: StructuredReview | null = null;
  try {
    parsed = JSON.parse(report.structuredOutput) as StructuredReview;
  } catch {
    parsed = null;
  }
  if (!parsed) return null;

  const review = normalizeReviewForDisplay(parsed);

  const parts: string[] = [];
  if (review.oneSentence) parts.push(review.oneSentence);
  for (const o of [
    ...review.themes,
    ...review.emotions,
    ...review.questions,
  ]) {
    if (o.title) parts.push(o.title);
    if (o.body) parts.push(o.body);
  }
  const seed = parts.join("\n").slice(0, 4000);

  if (review.storyConnections.length === 0 && seed.length === 0) return null;

  return {
    reviewId: report.id,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    storyConnections: review.storyConnections,
    seed,
  };
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
      _count: {
        select: {
          matches: {
            where: {
              state: "active",
              connection: { not: null },
            },
          },
        },
      },
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
        where: {
          state: "active",
          connection: { not: null },
        },
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

/**
 * RAG StoryChunk 상세를 조회한다. (관련 추천은 목록 단계에서 이미 제공하므로 제외)
 */
export async function getChunkDetail(
  chunkId: string,
): Promise<{ chunk: StoryChunkDetail } | null> {
  const chunk = await db.storyChunk.findFirst({
    where: {
      id: chunkId,
      rightsStatus: "approved",
      language: "ko",
    },
    include: { work: true },
  });
  if (!chunk) return null;
  return { chunk };
}

/**
 * 회고 storyConnections 텍스트 매칭용 corpus 후보.
 * published card + approved korean chunk.
 */
export async function listStoryCorpusCandidates(
  limit = 400,
): Promise<StoryCorpusCandidate[]> {
  const [cards, chunks] = await Promise.all([
    db.storyCard.findMany({
      where: { reviewStatus: "published" },
      include: { work: true },
      take: Math.ceil(limit / 2),
      orderBy: { createdAt: "desc" },
    }),
    db.storyChunk.findMany({
      where: { rightsStatus: "approved", language: "ko" },
      include: { work: true },
      take: Math.ceil(limit / 2),
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const out: StoryCorpusCandidate[] = [];
  for (const c of cards) {
    out.push({
      id: c.id,
      kind: "card",
      name: c.name,
      title: c.name,
      workTitle: c.work.title,
      author: c.work.author,
      themes: parseJsonArray(c.themes),
    });
  }
  for (const c of chunks) {
    out.push({
      id: c.id,
      kind: "chunk",
      name: c.title,
      title: c.title,
      workTitle: c.work.title,
      author: c.work.author,
      themes: parseJsonArray(c.themes),
    });
  }
  return out;
}

/**
 * 회고 상세/이야기 탭에서 쓸 이야기 목록을 한 계약으로 만든다.
 *
 * 우선순위:
 * 1) 이 회고의 storyConnections (가능하면 corpus id resolve)
 * 2) 없으면 최신 RAG matches
 * 3) 없으면 최신 card matches
 */
export async function getReviewScopedStoryItems(opts: {
  userId: string;
  storyConnections?: StructuredReview["storyConnections"];
  preferReviewConnections?: boolean;
}): Promise<StoryMirrorItem[]> {
  const preferReview = opts.preferReviewConnections !== false;
  const reviewConnections = opts.storyConnections ?? [];

  if (preferReview && reviewConnections.length > 0) {
    const candidates = await listStoryCorpusCandidates();
    const items = toReviewStoryItems(reviewConnections, candidates);
    if (items.length > 0) return items;
  }

  const [ragRun, cardRun] = await Promise.all([
    getLatestRagRun(opts.userId),
    getLatestRun(opts.userId),
  ]);

  const ragItems: StoryMirrorItem[] =
    ragRun?.matches
      .filter((m) => Boolean(m.connection?.trim()))
      .slice(0, 3)
      .map((m) => {
        const source = `${m.chunk.work.title}${
          m.chunk.locator ? ` · ${m.chunk.locator}` : ""
        }`;
        return {
          visualStoryId: buildStoryVisualId("chunk", m.chunkId),
          key: `rag-${m.id}`,
          title: m.chunk.title || m.chunk.work.title || "이야기",
          source,
          connection: m.connection!.trim(),
          differentPerspective: m.differentPerspective,
          href: buildStoryDetailHref(m.chunkId, {
            connection: m.connection,
            differentPerspective: m.differentPerspective,
            sourceLabel: source,
          }),
          origin: "rag" as const,
        };
      }) ?? [];

  if (ragItems.length > 0) return ragItems;

  const cardItems: StoryMirrorItem[] =
    cardRun?.matches.slice(0, 3).map((m) => {
      const source = `${m.card.work.title}${
        m.card.work.author ? ` · ${m.card.work.author}` : ""
      }`;
      const connection =
        m.narrativeBridge ||
        m.matchReason ||
        parseJsonArray(m.matchThemes).slice(0, 3).join(" · ") ||
        "이 이야기와 당신의 기록이 맞닿아 있습니다.";
      const theme0 = parseJsonArray(m.matchThemes)[0];
      const differentPerspective = theme0
        ? `이 인물 안에서 반복되는 주제는 ‘${theme0}’입니다.`
        : null;
      return {
        key: `card-${m.id}`,
        visualStoryId: buildStoryVisualId("card", m.card.id),
        title: m.card.name,
        source,
        connection,
        differentPerspective,
        href: buildStoryDetailHref(m.card.id, {
          connection,
          differentPerspective,
          sourceLabel: source,
        }),
        origin: "card" as const,
      };
    }) ?? [];

  return cardItems;
}
