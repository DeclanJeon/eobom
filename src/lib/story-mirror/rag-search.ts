/**
 * Story Mirror RAG v4.2 — local FTS5 search (no embeddings)
 *
 * SQLite FTS5(trigram)로 카드 비종속 StoryChunk를 검색한다.
 * 외부 임베딩/벡터 DB(BGE-M3, Qdrant, sqlite-vec)는 사용하지 않는다.
 */
import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/utils";

export const RAG_CORPUS_VERSION = "v4.2-seed-1";
export const RETRIEVER_VERSION = "fts5-trigram-1";

export type RetrievedChunk = {
  id: string;
  workId: string;
  workTitle: string;
  title: string;
  text: string;
  excerpt: string | null;
  summary: string | null;
  themes: string[];
  emotions: string[];
  situations: string[];
  language: string;
  rightsStatus: string;
  citationAllowed: boolean;
  sourceUrl: string | null;
  locator: string | null;
  searchScore: number;
  confidence: "low" | "medium" | "high";
};

// 사용자 쿼리를 FTS5 MATCH에 안전하게 사용할 수 있도록 정규화한다.
// 한국어/영어 낱말과 공백만 남기고 나머지(따옴표/세미콜론/특수문자)는 제거해 SQL 주입을 막는다.
export function normalizeQuery(query: string): string {
  return query
    .replace(/[^0-9a-zA-Z가-힣\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 정규화된 쿼리를 trigram MATCH 식으로 변환한다. 각 낱말을 따옴표로 감싸 OR 결합.
export function buildMatchExpr(normalized: string): string {
  const terms = normalized.split(" ").filter((t) => t.length > 0);
  if (terms.length === 0) return "";
  return terms.map((t) => `"${t}"`).join(" OR ");
}

function confidenceFromRank(rank: number): RetrievedChunk["confidence"] {
  const score = Math.abs(rank);
  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
}

export type SearchOptions = {
  limit?: number;
  language?: string;
  corpusVersion?: string;
  /** 동일 작품에서 허용할 최대 청크 수 (다양성) */
  maxPerWork?: number;
};

/**
 * FTS5 trigram 검색 → 권리/언어/코퍼스 필터 → 다양성 → top-N.
 * 후보가 없으면 빈 배열을 반환한다(호출 측에서 insufficientEvidence 처리).
 */
export async function searchChunks(
  query: string,
  opts: SearchOptions = {}
): Promise<RetrievedChunk[]> {
  const limit = Math.min(Math.max(opts.limit ?? 6, 1), 12);
  const maxPerWork = opts.maxPerWork ?? 2;
  const corpusVersion = opts.corpusVersion ?? RAG_CORPUS_VERSION;
  const language = opts.language;
  if (language && !/^(ko|en)$/.test(language)) {
    throw new Error(`지원하지 않는 language: ${language}`);
  }

  const normalized = normalizeQuery(query);
  const matchExpr = buildMatchExpr(normalized);
  if (!matchExpr) return [];

  const langClause = language ? `AND c.language = '${language}'` : "";

  const sql = `
    SELECT c.id, c.workId, c.title, c.text, c.excerpt, c.summary,
           c.themes, c.emotions, c.situations, c.language, c.rightsStatus,
           c.citationAllowed, c.sourceUrl, c.locator,
           w.title AS workTitle,
           bm25(StoryChunkFts) AS rank
    FROM StoryChunkFts
    JOIN StoryChunk c ON c.id = StoryChunkFts.chunkId
    JOIN StoryWork w ON w.id = c.workId
    WHERE StoryChunkFts MATCH '${matchExpr}'
      AND c.rightsStatus = 'approved'
      AND c.corpusVersion = '${corpusVersion}'
      ${langClause}
    ORDER BY rank
    LIMIT ${limit + maxPerWork}
  `;

  const rows = (await (db as any).$queryRawUnsafe(sql)) as Record<string, unknown>[];

  const out: RetrievedChunk[] = [];
  const perWork = new Map<string, number>();
  for (const r of rows) {
    const wid = String(r.workId);
    if ((perWork.get(wid) ?? 0) >= maxPerWork) continue;
    perWork.set(wid, (perWork.get(wid) ?? 0) + 1);

    out.push({
      id: String(r.id),
      workId: wid,
      workTitle: String(r.workTitle),
      title: r.title ? String(r.title) : "",
      text: String(r.text),
      excerpt: r.excerpt ? String(r.excerpt) : null,
      summary: r.summary ? String(r.summary) : null,
      themes: parseJsonArray(String(r.themes ?? "[]")),
      emotions: parseJsonArray(String(r.emotions ?? "[]")),
      situations: parseJsonArray(String(r.situations ?? "[]")),
      language: String(r.language),
      rightsStatus: String(r.rightsStatus),
      citationAllowed: Boolean(r.citationAllowed),
      sourceUrl: r.sourceUrl ? String(r.sourceUrl) : null,
      locator: r.locator ? String(r.locator) : null,
      searchScore: typeof r.rank === "number" ? r.rank : Number(r.rank),
      confidence: confidenceFromRank(Number(r.rank)),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * 테스트/신규 DB에서 FTS5 virtual table + 트리거를 보장한다.
 */
export async function ensureRagFts5(): Promise<void> {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { spawnSync } = await import("node:child_process");
  const sqlPath = path.join(process.cwd(), "prisma", "fts5-setup.sql");
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const sql = fs.readFileSync(sqlPath, "utf8");
  const res = spawnSync(
    "bunx",
    ["prisma", "db", "execute", "--file", sqlPath, "--schema", schemaPath],
    { stdio: "inherit" }
  );
  if (res.status !== 0) throw new Error(`fts5-setup 실패: ${res.status}`);
}
