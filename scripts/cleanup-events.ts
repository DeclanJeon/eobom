/**
 * scripts/cleanup-events.ts
 * EVENT_RETENTION_DAYS(90일) 경과 EventLog 삭제 — 계측 원문 미보존 정책(C8) + 저장 공간 관리.
 * cron: 0 3 * * * bun scripts/cleanup-events.ts
 */
import { EVENT_RETENTION_DAYS } from "../src/lib/events";
import { db } from "../src/lib/db";

async function main() {
  const cutoff = new Date(Date.now() - EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await db.eventLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  console.log(
    `[cleanup-events] deleted ${result.count} events older than ${EVENT_RETENTION_DAYS}d (cutoff ${cutoff.toISOString()})`,
  );
}

main()
  .catch((e) => {
    console.error("[cleanup-events] failed", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
