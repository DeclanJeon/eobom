/**
 * StoryChunk themes/emotions 교집합 Jaccard top3로 relatedChunkIds를 채운다.
 * 대상: db.storyChunk.findMany({where:{corpusVersion:"v4.3-corpus-expand"}}) 전체
 * 로그: "linked N chunks"
 */
import { db } from "@/lib/db";

const CORPUS_VERSION = "v4.3-corpus-expand";
const MAX_RELATED = 3;

type Row = {
  id: string;
  workId: string;
  title: string | null;
  themes: string;
  emotions: string;
};

function parseArr(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function jaccard(aThemes: string[], aEmotions: string[], bThemes: string[], bEmotions: string[]): number {
  const aSet = new Set([...aThemes, ...aEmotions].map((s) => s.trim()).filter(Boolean));
  const bSet = new Set([...bThemes, ...bEmotions].map((s) => s.trim()).filter(Boolean));
  if (aSet.size === 0 && bSet.size === 0) return 0;
  let inter = 0;
  for (const x of bSet) if (aSet.has(x)) inter++;
  const union = aSet.size + bSet.size - inter;
  return union === 0 ? 0 : inter / union;
}

async function main() {
  const chunks = (await db.storyChunk.findMany({
    where: { corpusVersion: CORPUS_VERSION },
    select: {
      id: true,
      workId: true,
      title: true,
      themes: true,
      emotions: true,
    },
  })) as Row[];

  console.log(`[link-related] ${chunks.length}개 청크 분석 (corpusVersion=${CORPUS_VERSION})`);
  let updated = 0;

  // Pre-parse to avoid repeated JSON.parse
  const parsed = chunks.map((c) => ({
    ...c,
    themesArr: parseArr(c.themes),
    emotionsArr: parseArr(c.emotions),
  }));

  for (const chunk of parsed) {
    const ranked = parsed
      .filter((other) => other.id !== chunk.id && other.workId !== chunk.workId)
      .map((other) => ({
        id: other.id,
        title: other.title,
        score: jaccard(chunk.themesArr, chunk.emotionsArr, other.themesArr, other.emotionsArr),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, MAX_RELATED);

    const relatedIds = ranked.map((r) => r.id);
    await db.storyChunk.update({
      where: { id: chunk.id },
      data: { relatedChunkIds: JSON.stringify(relatedIds) },
    });
    updated++;
    if (updated <= 8 || updated % 40 === 0) {
      const names = ranked.map((r) => r.title || r.id).join(", ");
      console.log(`  ${chunk.title || chunk.id} -> ${names || "(없음)"} (${ranked.map((r) => r.score.toFixed(2)).join(", ")})`);
    }
  }

  console.log(`linked ${updated} chunks`);
  console.log(`[link-related] 완료: ${updated}개 갱신`);
}

main().catch((err) => {
  console.error("[link-related] 실패:", err);
  process.exit(1);
});
