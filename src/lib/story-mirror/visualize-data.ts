/**
 * Story Mirror — Visualization Data Extractor
 *
 * 사용자 기록에서 시각화 데이터를 추출한다.
 */

import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";

export type TimelineDataPoint = {
  date: string;
  count: number;
  themes: string[];
  emotions: string[];
};

export type NetworkNode = {
  id: string;
  label: string;
  weight: number;
};

export type NetworkEdge = {
  source: string;
  target: string;
  weight: number;
};

export type EmotionDataPoint = {
  date: string;
  emotions: Record<string, number>;
};

export type StoryMatchLink = {
  entryId: string;
  entryDate: string;
  entryExcerpt: string;
  cardId: string;
  cardName: string;
  workTitle: string;
  matchThemes: string[];
  matchEmotions: string[];
};

/** 타임라인 데이터 추출 */
export async function extractTimelineData(
  userId: string,
  start: Date,
  end: Date,
): Promise<TimelineDataPoint[]> {
  const entries = await db.reflectionEntry.findMany({
    where: {
      userId,
      deletedAt: null,
      entryDate: { gte: start, lte: end },
    },
    orderBy: { entryDate: "asc" },
  });

  const byDate = new Map<string, TimelineDataPoint>();

  for (const entry of entries) {
    const key = entry.entryDate.toISOString().slice(0, 10);
    const existing = byDate.get(key);
    const themes = parseJsonArray(entry.tags);
    const emotions = parseJsonArray(entry.emotions);

    if (existing) {
      existing.count++;
      existing.themes.push(...themes);
      existing.emotions.push(...emotions);
    } else {
      byDate.set(key, {
        date: key,
        count: 1,
        themes,
        emotions,
      });
    }
  }

  return [...byDate.values()];
}

/** 네트워크 데이터 추출 (주제 동시출현) */
export async function extractNetworkData(
  userId: string,
  start: Date,
  end: Date,
): Promise<{ nodes: NetworkNode[]; edges: NetworkEdge[] }> {
  const entries = await db.reflectionEntry.findMany({
    where: {
      userId,
      deletedAt: null,
      entryDate: { gte: start, lte: end },
    },
  });

  const themeFreq = new Map<string, number>();
  const coOccurrence = new Map<string, number>();

  for (const entry of entries) {
    const themes = parseJsonArray(entry.tags);
    for (const t of themes) {
      themeFreq.set(t, (themeFreq.get(t) ?? 0) + 1);
    }
    for (let i = 0; i < themes.length; i++) {
      for (let j = i + 1; j < themes.length; j++) {
        const key = [themes[i], themes[j]].sort().join("|||");
        coOccurrence.set(key, (coOccurrence.get(key) ?? 0) + 1);
      }
    }
  }

  const nodes: NetworkNode[] = [...themeFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([label, weight]) => ({ id: label, label, weight }));

  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges: NetworkEdge[] = [...coOccurrence.entries()]
    .filter(([key]) => {
      const [a, b] = key.split("|||");
      return nodeIds.has(a) && nodeIds.has(b);
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([key, weight]) => {
      const [source, target] = key.split("|||");
      return { source, target, weight };
    });

  return { nodes, edges };
}

/** 감정 분포 데이터 추출 */
export async function extractEmotionData(
  userId: string,
  start: Date,
  end: Date,
): Promise<EmotionDataPoint[]> {
  const entries = await db.reflectionEntry.findMany({
    where: {
      userId,
      deletedAt: null,
      entryDate: { gte: start, lte: end },
    },
    orderBy: { entryDate: "asc" },
  });

  const byDate = new Map<string, Record<string, number>>();

  for (const entry of entries) {
    const key = entry.entryDate.toISOString().slice(0, 10);
    const emotions = parseJsonArray(entry.emotions);
    const current = byDate.get(key) ?? {};

    for (const e of emotions) {
      current[e] = (current[e] ?? 0) + 1;
    }
    byDate.set(key, current);
  }

  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, emotions]) => ({ date, emotions }));
}

/** 스토리 매칭 데이터 추출 */
export async function extractStoryMatchData(
  userId: string,
): Promise<StoryMatchLink[]> {
  const matches = await db.storyMirrorMatch.findMany({
    where: {
      run: { userId },
      state: "active",
    },
    include: {
      card: { include: { work: true } },
      evidence: true,
      run: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return matches.map((m) => {
    const entry = m.evidence[0]?.entryId
      ? m.evidence[0]
      : null;
    return {
      entryId: entry?.entryId ?? "",
      entryDate: entry?.createdAt.toISOString().slice(0, 10) ?? "",
      entryExcerpt: entry?.excerpt ?? "",
      cardId: m.cardId,
      cardName: m.card.name,
      workTitle: m.card.work.title,
      matchThemes: parseJsonArray(m.matchThemes),
      matchEmotions: parseJsonArray(m.matchEmotions),
    };
  });
}
