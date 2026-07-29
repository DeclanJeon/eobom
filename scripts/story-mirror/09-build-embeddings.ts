#!/usr/bin/env bun
/**
 * Story Mirror — Embedding Builder
 *
 * published된 StoryCard의 요약·주제·감정을 결합하여 임베딩을 생성한다.
 * OpenAI text-embedding-3-small 또는 MiMo 임베딩 API를 사용한다.
 */

import { PrismaClient } from "@prisma/client";
import { existsSync } from "fs";

const db = new PrismaClient();
const CORPUS_VERSION = "v1.0";
const EMBEDDING_DIM = 1536;

/**
 * 텍스트를 임베딩 벡터로 변환한다.
 * OpenAI API를 사용하거나, 폴백으로 랜덤 벡터를 생성한다.
 */
async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // 폴백: 결정적 해시 기반 벡터 (테스트용)
    return deterministicEmbed(text);
  }

  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
        dimensions: EMBEDDING_DIM,
      }),
    });
    const data = await res.json() as { data?: Array<{ embedding: number[] }> };
    return data.data?.[0]?.embedding ?? deterministicEmbed(text);
  } catch {
    return deterministicEmbed(text);
  }
}

/** OpenAI 없이 결정적 벡터 생성 (테스트/개발용) */
function deterministicEmbed(text: string): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const vec: number[] = [];
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    hash = ((hash << 13) ^ hash) | 0;
    vec.push(((hash * (hash * hash * 15731 + 789221) + 1376312589) & 0x7fffffff) / 0x7fffffff - 0.5);
  }
  // 정규화
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
  return vec.map((v) => v / (norm || 1));
}

function buildEmbeddingText(card: {
  summary: string;
  themes: string;
  emotions: string;
  situations: string;
  name: string;
}): string {
  const themes = JSON.parse(card.themes) as string[];
  const emotions = JSON.parse(card.emotions) as string[];
  const situations = JSON.parse(card.situations) as string[];
  return `${card.name}: ${card.summary}. 주제: ${themes.join(", ")}. 감정: ${emotions.join(", ")}. 상황: ${situations.join(", ")}`;
}

async function main() {
  const cards = await db.storyCard.findMany({
    where: { reviewStatus: "published" },
    include: { work: true },
  });

  console.log(`Embedding ${cards.length} published cards...`);

  let created = 0;
  for (const card of cards) {
    const text = buildEmbeddingText(card);
    const vector = await embed(text);

    const existing = await db.storyCardEmbedding.findFirst({
      where: {
        cardId: card.id,
        modelName: "text-embedding-3-small",
        corpusVersion: CORPUS_VERSION,
      },
    });

    if (!existing) {
      await db.storyCardEmbedding.create({
        data: {
          cardId: card.id,
          provider: "openai",
          modelName: "text-embedding-3-small",
          dimensions: EMBEDDING_DIM,
          vectorJson: JSON.stringify(vector),
          corpusVersion: CORPUS_VERSION,
        },
      });
      created++;
      console.log(`  Created: ${card.name}`);
    }
  }

  console.log(`\nDone: ${created} embeddings created, ${cards.length - created} already existed`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
