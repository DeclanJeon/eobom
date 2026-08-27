import { db } from "../src/lib/db";
import { projectCheckinToMoment } from "../src/lib/continuity/moment";

async function main() {
  const apply = process.env.MOMENTS_BACKFILL_APPLY === "1";
  const limit = Number(process.env.MOMENTS_BACKFILL_LIMIT ?? "0");
  const checkins = await db.dailyCheckIn.findMany({
    where: { user: { email: { not: null } } },
    select: {
      id: true,
      userId: true,
      cardKey: true,
      reaction: true,
      oneLine: true,
      entryId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    ...(Number.isInteger(limit) && limit > 0 ? { take: limit } : {}),
  });

  let created = 0;
  let wouldCreate = 0;
  let skippedExisting = 0;
  let skippedUnknown = 0;
  const contexts: Record<string, number> = {};

  for (const checkin of checkins) {
    const moment = projectCheckinToMoment(checkin);
    if (!moment) {
      skippedUnknown++;
      continue;
    }

    const existing = await db.moment.findUnique({
      where: { sourceCheckinId: checkin.id },
      select: { id: true },
    });
    if (existing) {
      skippedExisting++;
      continue;
    }

    const contextKey = moment.context ?? "none";
    contexts[contextKey] = (contexts[contextKey] ?? 0) + 1;
    if (!apply) {
      wouldCreate++;
      continue;
    }

    await db.moment.upsert({
      where: { sourceCheckinId: checkin.id },
      create: {
        userId: moment.userId,
        source: moment.source,
        sourceCheckinId: checkin.id,
        context: moment.context,
        verseKey: moment.verseKey,
        reaction: moment.reaction,
        oneLine: moment.oneLine,
        sourceEntryId: moment.sourceEntryId,
        promotedEntryId: moment.promotedEntryId,
        happenedAt: moment.happenedAt,
      },
      update: {},
    });
    created++;
  }

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    scanned: checkins.length,
    created,
    wouldCreate,
    skippedExisting,
    skippedUnknown,
    contexts,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
