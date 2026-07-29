import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { db } from "../src/lib/db";
import {
  ensureRagFts5,
  searchChunks,
  normalizeQuery,
  buildMatchExpr,
} from "../src/lib/story-mirror/rag-search";
import type { RetrievedChunk } from "../src/lib/story-mirror/rag-search";
import {
  streamMiMoGenerate,
  parseAndValidate,
} from "../src/lib/story-mirror/rag-generation";

const TEST_CORPUS = "test-rag-v1";

const SAMPLE: Array<{
  text: string;
  title: string;
  themes: string[];
  emotions: string[];
  situations: string[];
}> = [
  {
    text: "오만하다고 생각한 남자와 편견을 가지고 판단했던 자신을 돌아보는 과정.",
    title: "엘리자베트",
    themes: ["자기 발견"],
    emotions: ["후회"],
    situations: ["자기 의심"],
  },
  {
    text: "기생의 딸로 태어났으나 학문과 예절을 갖춘 춘향은 신분의 벽에 부딪힌다.",
    title: "춘향",
    themes: ["인내"],
    emotions: ["희망"],
    situations: ["위기 상황"],
  },
  {
    // 권리 미승인 → 검색에서 제외되어야 함
    text: "이 청크는 rightsStatus가 review라 검색되면 안 된다.",
    title: "비공개",
    themes: [],
    emotions: [],
    situations: [],
  },
];

async function seed() {
  await ensureRagFts5();
  await db.storyChunk.deleteMany({ where: { corpusVersion: TEST_CORPUS } });
  await db.storyWork.deleteMany({ where: { slug: { startsWith: "test-work-" } } });

  const work = await db.storyWork.create({
    data: {
      slug: `test-work-${Date.now()}`,
      title: "테스트 작품",
      sourceUrl: "internal://test",
      sourceKind: "internal",
      language: "ko",
      culture: "mixed",
      rightsRegion: "world",
      rightsBasis: "public_domain",
      rightsStatus: "approved",
      corpusVersion: TEST_CORPUS,
    },
  });

  const make = (idx: number, rightsStatus: string, citationAllowed: boolean) =>
    db.storyChunk.create({
      data: {
        workId: work.id,
        chunkIndex: idx,
        title: SAMPLE[idx].title,
        text: SAMPLE[idx].text,
        excerpt: SAMPLE[idx].text,
        summary: SAMPLE[idx].text,
        language: "ko",
        themes: JSON.stringify(SAMPLE[idx].themes),
        emotions: JSON.stringify(SAMPLE[idx].emotions),
        situations: JSON.stringify(SAMPLE[idx].situations),
        rightsStatus,
        citationAllowed,
        sourceUrl: "internal://test",
        corpusVersion: TEST_CORPUS,
      },
    });

  await make(0, "approved", true);
  await make(1, "approved", true);
  await make(2, "review", false);
}

async function cleanup() {
  await db.storyChunk.deleteMany({ where: { corpusVersion: TEST_CORPUS } });
  await db.storyWork.deleteMany({ where: { slug: { startsWith: "test-work-" } } });
}

describe("rag-search: query normalization", () => {
  it("정규화는 한국어/영어/공백만 남긴다", () => {
    expect(normalizeQuery("오만!@# 편견 123")).toBe("오만 편견 123");
    expect(buildMatchExpr("오만 편견")).toBe('"오만" OR "편견"');
    expect(buildMatchExpr("   ")).toBe("");
  });
});

describe("rag-search: FTS5 검색", () => {
  beforeAll(async () => {
    await seed();
  });
  afterAll(async () => {
    await cleanup();
  });

  it("승인된 청크를 검색하고 미승인 청크는 제외한다", async () => {
    const res = await searchChunks("춘향", { corpusVersion: TEST_CORPUS });
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((r) => r.rightsStatus === "approved")).toBe(true);
    expect(res.some((r) => r.title === "비공개")).toBe(false);
  });

  it("빈 쿼리는 빈 배열을 반환한다", async () => {
    const res = await searchChunks("   ", { corpusVersion: TEST_CORPUS });
    expect(res).toEqual([]);
  });

  it("상위 N을 제한한다", async () => {
    const res = await searchChunks("춘향 오만", { limit: 1, corpusVersion: TEST_CORPUS });
    expect(res.length).toBeLessThanOrEqual(1);
  });

  it("language 필터가 동작한다", async () => {
    const res = await searchChunks("춘향", { language: "en", corpusVersion: TEST_CORPUS });
    expect(res).toEqual([]);
  });
});

// MiMo SSE 스트리밍 모의 (네트워크 없이). fetchImpl로 주입한다.
function makeMockFetch(jsonText: string): typeof fetch {
  return (async () => {
    const lines = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: jsonText.slice(0, 10) } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: jsonText.slice(10) } }] })}\n`,
      `data: [DONE]\n`,
    ];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder();
        for (const p of lines) controller.enqueue(enc.encode(p));
        controller.close();
      },
    });
    return new Response(stream, { status: 200 });
  }) as unknown as typeof fetch;
}

const retrieved: RetrievedChunk[] = [
  {
    id: "chunk-A",
    workId: "w1",
    workTitle: "오만과 편견",
    title: "엘리자베트",
    text: "오만하다고 생각한 남자",
    excerpt: "오만",
    summary: "오만",
    themes: ["자기 발견"],
    emotions: ["후회"],
    situations: ["자기 의심"],
    language: "ko",
    rightsStatus: "approved",
    citationAllowed: true,
    sourceUrl: null,
    locator: null,
    searchScore: -1,
    confidence: "high",
  },
];

describe("rag-generation: MiMo 스트리밍", () => {
  it("SSE 델타를 누적하고 JSON을 파싱/검증한다", async () => {
    const json = JSON.stringify({
      summary: "당신의 편견을 돌아보는 여정",
      connections: [{ chunkId: "chunk-A", connection: "엘리자베트처럼 당신도" }],
    });
    const deltas: string[] = [];
    const result = await streamMiMoGenerate(
      { userInput: "나는 편견을 가졌나 봐", retrieved },
      { onDelta: (d) => deltas.push(d), fetchImpl: makeMockFetch(json) }
    );
    expect(deltas.join("")).toBe(json);
    expect(result.summary).toBe("당신의 편견을 돌아보는 여정");
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].chunkId).toBe("chunk-A");
  });

  it("제공되지 않은 chunkId 인용은 필터링된다", async () => {
    const json = JSON.stringify({
      summary: "요약",
      connections: [
        { chunkId: "chunk-A", connection: "ok" },
        { chunkId: "ghost", connection: "지어낸 연결" },
      ],
    });
    const result = await streamMiMoGenerate(
      { userInput: "x", retrieved },
      { fetchImpl: makeMockFetch(json) }
    );
    expect(result.connections).toHaveLength(1);
    expect(result.connections[0].chunkId).toBe("chunk-A");
  });

  it("MIMO_API_KEY 누락 시 에러", async () => {
    const prev = process.env.MIMO_API_KEY;
    delete process.env.MIMO_API_KEY;
    await expect(
      streamMiMoGenerate({ userInput: "x", retrieved })
    ).rejects.toThrow(/MIMO_API_KEY/);
    process.env.MIMO_API_KEY = prev;
  });

  it("parseAndValidate는 잘못된 JSON에서 에러", () => {
    expect(() => parseAndValidate("not json", retrieved)).toThrow();
  });
});
