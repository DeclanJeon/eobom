/**
 * FTS5 인덱스 재구축 + 코퍼스 검증
 */
import { ensureRagFts5, searchChunks } from "@/lib/story-mirror/rag-search";
import { db } from "@/lib/db";

async function main() {
  await ensureRagFts5();

  // FTS5 재구축 (테이블명: StoryChunkFts)
  await db.$executeRawUnsafe("DELETE FROM StoryChunkFts");
  await db.$executeRawUnsafe(`
    INSERT INTO StoryChunkFts (chunkId, text, excerpt, summary, title, themes)
    SELECT id, text, excerpt, summary, title, themes
    FROM StoryChunk
    WHERE rightsStatus = 'approved' AND language = 'ko'
  `);

  const ftsCount = await db.$queryRawUnsafe<{ c: number }[]>(
    "SELECT count(*) as c FROM StoryChunkFts",
  );
  console.log("FTS5 rows:", ftsCount[0].c);

  const biblical = await db.storyWork.count({ where: { culture: "biblical" } });
  console.log("Biblical works:", biblical);

  const newChunks = await db.storyChunk.count({
    where: { corpusVersion: "v4.3-corpus-expand" },
  });
  console.log("New chunks (v4.3):", newChunks);

  const totalChunks = await db.storyChunk.count({
    where: { rightsStatus: "approved", language: "ko" },
  });
  console.log("Total approved KO chunks:", totalChunks);

  // 샘플 검색
  const results = await searchChunks("외로움 사명 고독", { limit: 6 });
  console.log("\n샘플 검색 '외로움 사명 고독':");
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.title} (${r.workTitle})`);
  });

  const results2 = await searchChunks("용서 배신 인내", { limit: 6 });
  console.log("\n샘플 검색 '용서 배신 인내':");
  results2.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.title} (${r.workTitle})`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
