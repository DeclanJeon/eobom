#!/usr/bin/env bun
/**
 * rights manifest를 검증하고 카드의 rightsStatus를 업데이트한다.
 */

import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const MANIFEST = "data/story-mirror/sources.manifest.json";

type ManifestWork = {
  slug: string;
  rightsStatus: string;
  rightsRegion: string;
  rightsBasis: string;
};

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST, "utf-8")) as { works: ManifestWork[] };
  const works = await db.storyWork.findMany({ include: { cards: true } });
  let updated = 0;

  for (const work of works) {
    const rightsEntry = manifest.works.find((w) => w.slug === work.slug);
    if (!rightsEntry) {
      console.log(`  [MISSING] ${work.slug} — manifest에 없음`);
      continue;
    }

    if (work.rightsStatus !== rightsEntry.rightsStatus) {
      await db.storyWork.update({
        where: { id: work.id },
        data: { rightsStatus: rightsEntry.rightsStatus },
      });
      updated++;
      console.log(`  [UPDATED] ${work.slug}: ${work.rightsStatus} → ${rightsEntry.rightsStatus}`);
    }

    if (rightsEntry.rightsStatus !== "approved") {
      for (const card of work.cards) {
        if (card.reviewStatus === "published") {
          await db.storyCard.update({
            where: { id: card.id },
            data: { reviewStatus: "draft" },
          });
          console.log(`  [DOWNGRADED] ${card.name}: published → draft`);
        }
      }
    }
  }

  console.log(`\nTotal: ${works.length} works, ${updated} updated`);

  const published = await db.storyCard.count({ where: { reviewStatus: "published" } });
  const draft = await db.storyCard.count({ where: { reviewStatus: "draft" } });
  console.log(`Published: ${published}, Draft: ${draft}`);
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
