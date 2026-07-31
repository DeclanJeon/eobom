/**
 * StoryChunk themes/emotions 겹침으로 relatedChunkIds를 채운다.
 * 같은 work는 제외, 상위 4개만 유지.
 */
import { db } from "@/lib/db";

const CORPUS_VERSION = "v4.2-seed-1";
const MAX_RELATED = 4;

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

function scoreOverlap(a: Row, b: Row): number {
  const at = new Set(parseArr(a.themes));
  const ae = new Set(parseArr(a.emotions));
  const bt = parseArr(b.themes);
  const be = parseArr(b.emotions);
  let score = 0;
  for (const t of bt) if (at.has(t)) score += 2;
  for (const e of be) if (ae.has(e)) score += 1;
  return score;
}

async function main() {
  const chunks = (await db.storyChunk.findMany({
    where: {
      rightsStatus: "approved",
      language: "ko",
      corpusVersion: CORPUS_VERSION,
    },
    select: {
      id: true,
      workId: true,
      title: true,
      themes: true,
      emotions: true,
    },
  })) as Row[];

  console.log(`[link-related] ${chunks.length}개 청크 분석`);
  let updated = 0;

  for (const chunk of chunks) {
    const ranked = chunks
      .filter((other) => other.id !== chunk.id && other.workId !== chunk.workId)
      .map((other) => ({ id: other.id, score: scoreOverlap(chunk, other), title: other.title }))
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
      console.log(`  ${chunk.title || chunk.id} -> ${names || "(없음)"}`);
    }
  }

  console.log(`[link-related] 완료: ${updated}개 갱신`);
}

main().catch((err) => {
  console.error("[link-related] 실패:", err);
  process.exit(1);
});
