/**
 * Story Mirror — Corpus Seed Script
 *
 * 시드 데이터를 DB에 주입한다.
 * 실행: bun run scripts/story-mirror/seed-corpus.ts
 */

import { PrismaClient } from "@prisma/client";
import { BIBLE_CHARACTERS } from "../../src/lib/story-mirror/seed/bible-characters";
import { KOREAN_CLASSICS } from "../../src/lib/story-mirror/seed/korean-classics";
import { WORLD_CLASSICS } from "../../src/lib/story-mirror/seed/world-classics";

const db = new PrismaClient();
const CORPUS_VERSION = "v1.0";

async function seedBibleCharacters() {
  let created = 0;
  for (const ch of BIBLE_CHARACTERS) {
    const existing = await db.storyWork.findFirst({
      where: { slug: `bible-${ch.slug}` },
    });
    if (existing) continue;

    const work = await db.storyWork.create({
      data: {
        slug: `bible-${ch.slug}`,
        title: ch.name,
        titleOriginal: ch.nameEn,
        author: "성경",
        sourceKind: "bible",
        language: "ko",
        culture: "biblical",
        era: "고대",
        sourceUrl: "https://www.bible.com/ko",
        rightsRegion: "KR",
        rightsBasis: "link_only",
        rightsStatus: "approved",
        corpusVersion: CORPUS_VERSION,
      },
    });

    const card = await db.storyCard.create({
      data: {
        workId: work.id,
        kind: "character",
        name: ch.name,
        aliases: JSON.stringify([ch.nameEn]),
        locale: "ko",
        summary: ch.summary,
        arc: ch.arc,
        themes: JSON.stringify(ch.themes),
        emotions: JSON.stringify(ch.emotions),
        situations: JSON.stringify(ch.situations),
        contentWarnings: JSON.stringify(ch.contentWarnings),
        reviewStatus: "draft",
        cardVersion: "1.0",
      },
    });

    // passage 주입
    const edition = await db.storyEdition.create({
      data: {
        workId: work.id,
        sourceUrl: work.sourceUrl,
        rightsStatus: "approved",
        textStored: false,
        accessedAt: new Date(),
      },
    });

    for (const kp of ch.keyPassages) {
      await db.storyPassage.create({
        data: {
          cardId: card.id,
          editionId: edition.id,
          locator: kp.ref,
          text: kp.text,
          sourceUrl: work.sourceUrl,
          rightsStatus: "approved",
          citationAllowed: true,
        },
      });
    }
    created++;
  }
  return created;
}

async function seedKoreanClassics() {
  let created = 0;
  for (const kc of KOREAN_CLASSICS) {
    const existing = await db.storyWork.findFirst({
      where: { slug: `korean-${kc.slug}` },
    });
    if (existing) continue;

    const work = await db.storyWork.create({
      data: {
        slug: `korean-${kc.slug}`,
        title: kc.workTitle,
        author: "조선 시대",
        sourceKind: "korean_open_data",
        language: "ko",
        culture: "korean",
        era: kc.era,
        sourceUrl: kc.sourceUrl,
        rightsRegion: "KR",
        rightsBasis: "unknown",
        rightsStatus: kc.rightsStatus,
        corpusVersion: CORPUS_VERSION,
      },
    });

    await db.storyCard.create({
      data: {
        workId: work.id,
        kind: "character",
        name: kc.name,
        locale: "ko",
        summary: kc.summary,
        arc: kc.arc,
        themes: JSON.stringify(kc.themes),
        emotions: JSON.stringify(kc.emotions),
        situations: JSON.stringify(kc.situations),
        contentWarnings: JSON.stringify(kc.contentWarnings),
        reviewStatus: "draft",
        cardVersion: "1.0",
      },
    });
    created++;
  }
  return created;
}

async function seedWorldClassics() {
  let created = 0;
  for (const wc of WORLD_CLASSICS) {
    const existing = await db.storyWork.findFirst({
      where: { slug: `world-${wc.slug}` },
    });
    if (existing) continue;

    const work = await db.storyWork.create({
      data: {
        slug: `world-${wc.slug}`,
        title: wc.workTitle,
        titleOriginal: wc.workTitleOriginal,
        author: wc.author,
        translator: undefined,
        sourceKind: "gutenberg",
        language: "ko",
        culture: wc.culture,
        era: wc.era,
        sourceUrl: wc.sourceUrl,
        rightsRegion: "US",
        rightsBasis: "public_domain",
        rightsStatus: wc.rightsStatus,
        corpusVersion: CORPUS_VERSION,
      },
    });

    await db.storyCard.create({
      data: {
        workId: work.id,
        kind: "character",
        name: wc.name,
        aliases: JSON.stringify([wc.nameEn]),
        locale: "ko",
        summary: wc.summary,
        arc: wc.arc,
        themes: JSON.stringify(wc.themes),
        emotions: JSON.stringify(wc.emotions),
        situations: JSON.stringify(wc.situations),
        contentWarnings: JSON.stringify(wc.contentWarnings),
        reviewStatus: "draft",
        cardVersion: "1.0",
      },
    });
    created++;
  }
  return created;
}

async function main() {
  console.log("Story Mirror corpus seeding...");

  const bible = await seedBibleCharacters();
  console.log(`  Bible characters: ${bible} created`);

  const korean = await seedKoreanClassics();
  console.log(`  Korean classics: ${korean} created`);

  const world = await seedWorldClassics();
  console.log(`  World classics: ${world} created`);

  const totalWorks = await db.storyWork.count();
  const totalCards = await db.storyCard.count();
  console.log(`\nTotal: ${totalWorks} works, ${totalCards} cards`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
