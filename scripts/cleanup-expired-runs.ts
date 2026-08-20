/**
 * scripts/cleanup-expired-runs.ts
 * 만료된 StoryRagRun 삭제. StoryRagMatch / StoryRagEvidence는 FK cascade로 함께 정리된다.
 * cron: 0 3 * * * bun scripts/cleanup-expired-runs.ts
 */
import { db } from "../src/lib/db";

async function main() {
  const now = new Date();
  const result = await db.storyRagRun.deleteMany({
    where: { expiresAt: { lte: now } },
  });
  console.log(`[cleanup-expired-runs] deleted ${result.count} runs (expiresAt <= ${now.toISOString()})`);
}

main()
  .catch((e) => {
    console.error("[cleanup-expired-runs] failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
