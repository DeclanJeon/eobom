/**
 * Story Mirror RAG v4.2 — corpus ingestion
 *
 * 기존 seed 소스(world-classics, korean-classics, bible-characters)에서
 * 카드 비종속 StoryChunk + FTS5 인덱스를 생성한다.
 * 임베딩/외부 벡터 DB 없이 SQLite FTS5(trigram)로 검색한다.
 *
 * 실행: bun run scripts/story-mirror/ingest-chunks.ts
 */
import { db } from "../../src/lib/db";
import type { Prisma } from "@prisma/client";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_VERSION = "v4.3-corpus-expand";

// FTS5 virtual table + 동기화 트리거를 멱등적으로 보장한다.
// (CREATE TRIGGER ... BEGIN/END; 는 단일 문으로 실행해야 하므로 prisma db execute 사용)
async function ensureFts5() {
  const schemaPath = join(__dirname, "../../prisma/schema.prisma");
  const sqlPath = join(__dirname, "../../prisma/fts5-setup.sql");
  const res = spawnSync(
    "bunx",
    ["prisma", "db", "execute", "--file", sqlPath, "--schema", schemaPath],
    { stdio: "inherit" }
  );
  if (res.status !== 0) {
    throw new Error(`prisma db execute failed (fts5-setup): ${res.status}`);
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function checksum(text: string): string {
  return Bun.hash(text).toString(36);
}

type StoryChunkData = Prisma.StoryChunkUncheckedCreateInput;
type StoryChunkCreateArgs = { data: StoryChunkData };

async function upsertChunk({ data }: StoryChunkCreateArgs) {
  const existing = await db.storyChunk.findFirst({
    where: {
      workId: data.workId,
      chunkIndex: data.chunkIndex,
      corpusVersion: data.corpusVersion,
    },
    select: { id: true },
  });

  if (existing) {
    return db.storyChunk.update({
      where: { id: existing.id },
      data,
    });
  }
  return db.storyChunk.create({ data });
}

function composeText(parts: string[]): string {
  return parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

async function upsertWork(opts: {
  slug: string;
  title: string;
  titleOriginal?: string;
  author?: string;
  sourceKind: string;
  language: string;
  culture: string;
  era?: string;
  sourceUrl: string;
  rightsBasis: string;
}) {
  const existing = await db.storyWork.findUnique({ where: { slug: opts.slug } });
  if (existing) return existing.id;
  const created = await db.storyWork.create({
    data: {
      slug: opts.slug,
      title: opts.title,
      titleOriginal: opts.titleOriginal,
      author: opts.author,
      sourceKind: opts.sourceKind,
      language: opts.language,
      culture: opts.culture,
      era: opts.era,
      sourceUrl: opts.sourceUrl,
      landingPageUrl: opts.sourceUrl,
      licenseUrl: opts.sourceUrl,
      rightsRegion: "world",
      rightsBasis: opts.rightsBasis,
      rightsStatus: "approved",
      corpusVersion: CORPUS_VERSION,
    },
  });
  return created.id;
}

type BaseSeed = {
  slug: string;
  name: string;
  summary: string;
  arc: string;
  themes: string[];
  emotions: string[];
  situations: string[];
  contentWarnings: string[];
};

// 클래식 인물 1건 → 청크 2개(요약/서사 + 상황/감정)로 검색 다양성을 확보한다.
async function ingestClassic(seed: any, workId: string) {
  const summaryText = composeText([seed.summary, seed.arc]);
  await upsertChunk({
    data: {
      workId,
      chunkIndex: 0,
      title: seed.name,
      text: summaryText,
      excerpt: seed.summary,
      summary: seed.summary,
      language: "ko",
      themes: JSON.stringify(seed.themes),
      emotions: JSON.stringify(seed.emotions),
      situations: JSON.stringify(seed.situations),
      contentWarnings: JSON.stringify(seed.contentWarnings),
      rightsStatus: "approved",
      citationAllowed: true,
      sourceUrl: seed.sourceUrl,
      checksum: checksum(`s:${summaryText}`),
      corpusVersion: CORPUS_VERSION,
    },
  });
  const situationText = composeText([
    ...(seed.situations ?? []),
    ...(seed.themes ?? []),
    ...(seed.emotions ?? []),
  ]);
  await upsertChunk({
    data: {
      workId,
      chunkIndex: 1,
      title: `${seed.name} — 상황과 감정`,
      text: situationText,
      excerpt: situationText,
      summary: seed.summary,
      language: "ko",
      themes: JSON.stringify(seed.themes),
      emotions: JSON.stringify(seed.emotions),
      situations: JSON.stringify(seed.situations),
      contentWarnings: JSON.stringify(seed.contentWarnings),
      rightsStatus: "approved",
      citationAllowed: true,
      sourceUrl: seed.sourceUrl,
      checksum: checksum(`u:${situationText}`),
      corpusVersion: CORPUS_VERSION,
    },
  });
}

async function main() {
  await ensureFts5();

  // 기존 청크 ID를 유지해 StoryRagMatch가 배포마다 cascade 삭제되지 않도록 upsert한다.
  const { WORLD_CLASSICS } = await import(
    "../../src/lib/story-mirror/seed/world-classics"
  );
  const { KOREAN_CLASSICS } = await import(
    "../../src/lib/story-mirror/seed/korean-classics"
  );
  const { BIBLE_CHARACTERS } = await import(
    "../../src/lib/story-mirror/seed/bible-characters"
  );

  // 1) 세계 고전
  for (const s of WORLD_CLASSICS as BaseSeed[]) {
    const seed = s as any;
    const workId = await upsertWork({
      slug: slugify(`${seed.workTitle}-${seed.nameEn}`),
      title: seed.workTitle,
      titleOriginal: seed.workTitleOriginal,
      author: seed.author,
      sourceKind: "gutenberg",
      language: "ko",
      culture: seed.culture,
      era: seed.era,
      sourceUrl: seed.sourceUrl,
      rightsBasis: "public_domain",
    });
    await ingestClassic(seed, workId);
  }

  // 2) 한국 고전
  for (const s of KOREAN_CLASSICS as BaseSeed[]) {
    const seed = s as any;
    const workId = await upsertWork({
      slug: slugify(`${seed.workTitle}-${seed.slug}`),
      title: seed.workTitle,
      titleOriginal: seed.workTitleOriginal,
      author: undefined,
      sourceKind: "korean_open_data",
      language: "ko",
      culture: "korean",
      era: seed.era,
      sourceUrl: seed.sourceUrl,
      rightsBasis: "public_domain",
    });
    await ingestClassic(seed, workId);
  }

  // 3) 성경 인물 — keyPassages 각각 = 청크 1건(실제 본문 텍스트)
  for (const s of BIBLE_CHARACTERS as BaseSeed[]) {
    const seed = s as any;
    const workId = await upsertWork({
      slug: slugify(`${seed.nameEn}-${seed.slug}`),
      title: seed.name,
      titleOriginal: seed.nameEn,
      author: undefined,
      sourceKind: "bible",
      language: "ko",
      culture: "biblical",
      era: "ancient",
      sourceUrl: "https://www.biblegateway.com/",
      rightsBasis: "public_domain",
    });
    const passages = seed.keyPassages ?? [];
    for (let i = 0; i < passages.length; i++) {
      const p = passages[i];
      await upsertChunk({
        data: {
          workId,
          chunkIndex: i,
          locator: p.ref,
          title: `${seed.name} (${p.ref})`,
          text: p.text,
          excerpt: p.text,
          summary: seed.summary,
          language: "ko",
          themes: JSON.stringify(seed.themes),
          emotions: JSON.stringify(seed.emotions),
          situations: JSON.stringify(seed.situations),
          contentWarnings: JSON.stringify(seed.contentWarnings),
          rightsStatus: "approved",
          citationAllowed: true,
          sourceUrl: p.ref,
          checksum: checksum(p.text),
          corpusVersion: CORPUS_VERSION,
        },
      });
    }
  }

  const total = await db.storyChunk.count({
    where: { corpusVersion: CORPUS_VERSION, rightsStatus: "approved" },
  });
  const ftsCount = (await (db as any).$queryRawUnsafe(
    "SELECT count(*) AS c FROM StoryChunkFts"
  )) as { c: number }[];
  console.log(`[ingest] StoryChunk 생성: ${total} (approved, ${CORPUS_VERSION})`);
  console.log(`[ingest] FTS5 인덱스 행: ${ftsCount[0].c}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
