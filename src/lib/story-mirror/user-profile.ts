/**
 * Story Mirror — User Profile Extractor
 *
 * 사용자의 묵상 기록에서 주제·감정·성구를 추출하여
 * StoryCard 매칭에 사용하는 프로파일을 만든다.
 */

import type { Theme, Emotion } from "./vocab";
import { parseAndFilterThemes, parseAndFilterEmotions } from "./vocab";
import { parseJsonArray } from "@/lib/utils";

export type UserProfile = {
  topThemes: Theme[];
  topEmotions: Emotion[];
  themeFrequency: Record<string, number>;
  emotionFrequency: Record<string, number>;
  scriptureRefs: string[];
  entryCount: number;
  dateSpan: { earliest: string; latest: string };
};

export type EntryForProfile = {
  id: string;
  entryDate: string;
  /** 기록 수정 감지용 — fingerprint에 반영된다 */
  updatedAt: string;
  themes: string[];
  emotions: string[];
  scriptureRefs: string[];
};

/**
 * 여러 기록에서 사용자 프로파일을 생성한다.
 * 빈도순으로 상위 N개를 추출한다.
 */
export function buildUserProfile(
  entries: EntryForProfile[],
  opts: { maxThemes?: number; maxEmotions?: number } = {},
): UserProfile {
  const maxThemes = opts.maxThemes ?? 10;
  const maxEmotions = opts.maxEmotions ?? 8;

  const themeFreq: Record<string, number> = {};
  const emotionFreq: Record<string, number> = {};
  const allScriptures: string[] = [];

  for (const entry of entries) {
    for (const t of entry.themes) {
      const key = t.toLowerCase();
      themeFreq[key] = (themeFreq[key] ?? 0) + 1;
    }
    for (const e of entry.emotions) {
      const key = e.toLowerCase();
      emotionFreq[key] = (emotionFreq[key] ?? 0) + 1;
    }
    allScriptures.push(...entry.scriptureRefs);
  }

  const sortedThemes = Object.entries(themeFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxThemes)
    .map(([t]) => t as Theme);

  const sortedEmotions = Object.entries(emotionFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxEmotions)
    .map(([e]) => e as Emotion);

  const dates = entries.map((e) => e.entryDate).sort();

  return {
    topThemes: sortedThemes,
    topEmotions: sortedEmotions,
    themeFrequency: themeFreq,
    emotionFrequency: emotionFreq,
    scriptureRefs: [...new Set(allScriptures)],
    entryCount: entries.length,
    dateSpan: {
      earliest: dates[0] ?? "",
      latest: dates[dates.length - 1] ?? "",
    },
  };
}

/**
 * ReflectionEntry에서 EntryForProfile을 추출한다.
 */
export function entryToProfile(entry: {
  id: string;
  entryDate: Date | string;
  updatedAt: Date | string;
  tags: string;
  emotions: string;
  scriptureRefs: string;
}): EntryForProfile {
  return {
    id: entry.id,
    entryDate:
      typeof entry.entryDate === "string"
        ? entry.entryDate
        : entry.entryDate.toISOString(),
    updatedAt:
      typeof entry.updatedAt === "string"
        ? entry.updatedAt
        : entry.updatedAt.toISOString(),
    themes: parseAndFilterThemes(entry.tags),
    emotions: parseAndFilterEmotions(entry.emotions),
    scriptureRefs: parseJsonArray(entry.scriptureRefs),
  };
}
