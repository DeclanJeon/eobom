import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { db } from "../src/lib/db";
import {
  ensureRagFts5,
  searchChunks,
  RAG_CORPUS_VERSION,
} from "../src/lib/story-mirror/rag-search";

const EMAIL = `rag-e2e-${Date.now()}@test.local`;
const UNIQUE = "e2e고유청크토큰"; // 라우트가 검색하는 코퍼스에서 유일한 토큰

type SseEvent = { event: string; data: unknown };

// requireApiUser를 스텁: ok=true + user.id 만 반환(라우트가 DB에서 전체 사용자 로드)
mock.module("@/lib/session", () => ({
  requireApiUser: async (id?: string) => ({
    ok: true,
    user: { id: id ?? "rag-e2e-user" },
  }),
}));

// mock.module가 적용되려면 라우트 모듈 평가 전에 등록돼야 한다.
// ESM 정적 import는 호이스팅되어 먼저 평가되므로, 테스트 경계 예외로 동적 import를 사용한다.
const { POST } = await import(
  "../src/app/api/story-mirror/rag/runs/stream/route"
);

let userId = "";
let workSlug = `e2e-work-${Date.now()}`;
let chunkId = "";

// MiMo SSE 모의: 전달된 JSON을 스트리밍한다.
function makeMockFetch(jsonText: string): typeof fetch {
  return (async () => {
    const lines = [
      `data: ${JSON.stringify({ choices: [{ delta: { content: jsonText.slice(0, 12) } }] })}\n`,
      `data: ${JSON.stringify({ choices: [{ delta: { content: jsonText.slice(12) } }] })}\n`,
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

function parseSSE(text: string): SseEvent[] {
  const out: SseEvent[] = [];
  for (const block of text.split("\n\n")) {
    if (!block.trim()) continue;
    const ev: { event?: string; data?: string } = {};
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) ev.event = line.slice(6).trim();
      else if (line.startsWith("data:")) ev.data = line.slice(5).trim();
    }
    out.push({
      event: ev.event ?? "",
      data: ev.data ? JSON.parse(ev.data) : undefined,
    });
  }
  return out;
}

beforeAll(async () => {
  await ensureRagFts5();
  await db.user.deleteMany({ where: { email: EMAIL } });

  const user = await db.user.create({
    data: {
      email: EMAIL,
      storyMirrorEnabled: true,
      storyMirrorExternalConsent: true,
      storyMirrorLastConsentVersion: "v4.2",
      locale: "ko",
    },
  });
  userId = user.id;

  const work = await db.storyWork.create({
    data: {
      slug: workSlug,
      title: "E2E 작품",
      sourceUrl: "internal://e2e",
      sourceKind: "internal",
      language: "ko",
      culture: "mixed",
      rightsRegion: "world",
      rightsBasis: "public_domain",
      rightsStatus: "approved",
      corpusVersion: RAG_CORPUS_VERSION,
    },
  });
  const chunk = await db.storyChunk.create({
    data: {
      workId: work.id,
      chunkIndex: 0,
      title: UNIQUE,
      text: `${UNIQUE} 라임과 무화과 이야기 거울 테스트 청크입니다.`,
      excerpt: UNIQUE,
      summary: UNIQUE,
      language: "ko",
      themes: "[]",
      emotions: "[]",
      situations: "[]",
      rightsStatus: "approved",
      citationAllowed: true,
      sourceUrl: "internal://e2e",
      corpusVersion: RAG_CORPUS_VERSION,
    },
  });
  chunkId = chunk.id;
});

afterAll(async () => {
  await db.storyRagRun.deleteMany({ where: { userId } });
  if (chunkId) await db.storyChunk.deleteMany({ where: { id: chunkId } });
  await db.storyWork.deleteMany({ where: { slug: workSlug } });
  await db.user.deleteMany({ where: { email: EMAIL } });
});

describe("RAG SSE 엔드포인트 E2E", () => {
  it("동의 게이트: 외부 동의 없으면 403", async () => {
    mock.module("@/lib/session", () => ({
      requireApiUser: async () => ({
        ok: false,
        response: new Response(JSON.stringify({ error: "no" }), { status: 403 }),
      }),
    }));
    const req = new Request("http://localhost/api/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: UNIQUE }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
    mock.module("@/lib/session", () => ({
      requireApiUser: async () => ({ ok: true, user: { id: userId } }),
    }));
  });

  it("정상 흐름: retrieval → delta → complete + 영속화", async () => {
    mock.module("@/lib/session", () => ({
      requireApiUser: async () => ({ ok: true, user: { id: userId } }),
    }));

    const retrieved = await searchChunks(UNIQUE, { corpusVersion: RAG_CORPUS_VERSION });
    expect(retrieved.length).toBeGreaterThan(0);
    const targetId = retrieved[0].id;

    const json = JSON.stringify({
      summary: "라임과 무화과를 통해 본 당신의 계절",
      connections: [{ chunkId: targetId, connection: "이 청크는 당신과 닮았다" }],
    });
    const prevFetch = globalThis.fetch;
    globalThis.fetch = makeMockFetch(json);

    const req = new Request("http://localhost/api/story-mirror/rag/runs/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: UNIQUE, locale: "ko" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const text = await res.text();
    globalThis.fetch = prevFetch;

    const events = parseSSE(text);
    const types = events.map((e) => e.event);

    const retrievalIdx = types.indexOf("retrieval");
    const deltaIdx = types.indexOf("delta");
    const completeIdx = types.indexOf("complete");
    expect(retrievalIdx).toBeGreaterThanOrEqual(0);
    expect(deltaIdx).toBeGreaterThan(retrievalIdx);
    expect(completeIdx).toBeGreaterThan(deltaIdx);

    const retrieval = events[retrievalIdx].data as {
      candidates: { chunkId: string }[];
    };
    expect(retrieval.candidates.some((c) => c.chunkId === targetId)).toBe(true);

    const complete = events[completeIdx].data as {
      summary: string;
      connections: { chunkId: string }[];
    };
    expect(complete.summary).toBe("라임과 무화과를 통해 본 당신의 계절");
    expect(complete.connections[0].chunkId).toBe(targetId);

    const run = await db.storyRagRun.findFirst({
      where: { userId, status: "complete" },
      include: { matches: true },
    });
    expect(run).not.toBeNull();
    expect(run!.matches.length).toBeGreaterThan(0);
    const matched = run!.matches.find((m) => m.chunkId === targetId);
    expect(matched?.connection).toBe("이 청크는 당신과 닮았다");
  });

  it("후보 없음: insufficientEvidence + status", async () => {
    mock.module("@/lib/session", () => ({
      requireApiUser: async () => ({ ok: true, user: { id: userId } }),
    }));
    const req = new Request("http://localhost/api/story-mirror/rag/runs/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: "zzzqwx 없는단어 티비엠포" }),
    });
    const res = await POST(req);
    const text = await res.text();
    const events = parseSSE(text);
    expect(events.some((e) => e.event === "insufficientEvidence")).toBe(true);
    expect(events.some((e) => e.event === "retrieval")).toBe(false);

    const run = await db.storyRagRun.findFirst({
      where: { userId, status: "insufficient_evidence" },
      orderBy: { createdAt: "desc" },
    });
    expect(run).not.toBeNull();
  });
});
