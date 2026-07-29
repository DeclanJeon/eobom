import { describe, it, expect, beforeAll, afterAll, mock } from "bun:test";
import { db } from "../src/lib/db";
import { RAG_CORPUS_VERSION } from "../src/lib/story-mirror/rag-search";

const EMAIL = `rag-history-${Date.now()}@test.local`;
const EMAIL2 = `rag-history-2-${Date.now()}@test.local`;

let forceAuthFail = false;
const USER_ID = "rag-history-user";
const USER_ID2 = "rag-history-user-2";

// requireApiUser 스텁: forceAuthFail 플래그로 401 경로도 검증
mock.module("@/lib/session", () => ({
  requireApiUser: async () =>
    forceAuthFail
      ? { ok: false, response: new Response("denied", { status: 401 }) }
      : { ok: true, user: { id: USER_ID } },
}));

// mock.module 적용을 위해 라우트 모듈은 동적 import
const { GET: listGET } = await import(
  "../src/app/api/story-mirror/rag/runs/route"
);
const { GET: detailGET } = await import(
  "../src/app/api/story-mirror/rag/runs/[id]/route"
);

let workId = "";
let chunkId = "";
let runId = "";
let otherRunId = "";

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: { in: [EMAIL, EMAIL2] } } });
  await db.user.create({
    data: {
      email: EMAIL,
      id: USER_ID,
      storyMirrorEnabled: true,
      storyMirrorExternalConsent: true,
      storyMirrorLastConsentVersion: "v4.2",
      locale: "ko",
    },
  });
  await db.user.create({
    data: { email: EMAIL2, id: USER_ID2, locale: "ko" },
  });

  const work = await db.storyWork.create({
    data: {
      slug: `history-work-${Date.now()}`,
      title: "역사 작품",
      sourceUrl: "internal://history",
      sourceKind: "internal",
      language: "ko",
      culture: "mixed",
      rightsRegion: "world",
      rightsBasis: "public_domain",
      rightsStatus: "approved",
      corpusVersion: RAG_CORPUS_VERSION,
    },
  });
  workId = work.id;

  const chunk = await db.storyChunk.create({
    data: {
      workId: work.id,
      chunkIndex: 0,
      title: "역사 청크",
      text: "역사 청크 본문",
      excerpt: "역사 청크",
      summary: "역사 청크",
      language: "ko",
      themes: "[]",
      emotions: "[]",
      situations: "[]",
      rightsStatus: "approved",
      citationAllowed: true,
      sourceUrl: "internal://history",
      corpusVersion: RAG_CORPUS_VERSION,
    },
  });
  chunkId = chunk.id;

  const run = await db.storyRagRun.create({
    data: {
      userId: USER_ID,
      inputFingerprint: "fp-history",
      corpusVersion: RAG_CORPUS_VERSION,
      retrieverVersion: "r",
      generatorVersion: "g",
      policyVersion: "?" ,
      consentSnapshot: "{}",
      status: "complete",
      summary: "이것은 요약입니다.",
      completedAt: new Date(),
      matches: {
        create: [
          {
            chunkId: chunk.id,
            searchScore: 0.5,
            confidence: "medium",
            connection: "연결 내용",
            differentPerspective: "다른 시선",
          },
        ],
      },
    },
  });
  runId = run.id;

  // 다른 사용자의 run (404 경계 검증용)
  const otherRun = await db.storyRagRun.create({
    data: {
      userId: USER_ID2,
      inputFingerprint: "fp-other",
      corpusVersion: RAG_CORPUS_VERSION,
      retrieverVersion: "r",
      generatorVersion: "g",
      policyVersion: "?",
      consentSnapshot: "{}",
      status: "complete",
      summary: "남의 요약",
    },
  });
  otherRunId = otherRun.id;
});

afterAll(async () => {
  if (runId) await db.storyRagRun.deleteMany({ where: { id: runId } });
  if (otherRunId) await db.storyRagRun.deleteMany({ where: { id: otherRunId } });
  if (chunkId) await db.storyChunk.deleteMany({ where: { id: chunkId } });
  if (workId) await db.storyWork.deleteMany({ where: { id: workId } });
  await db.user.deleteMany({ where: { email: { in: [EMAIL, EMAIL2] } } });
});

describe("RAG run 이력 조회", () => {
  it("GET /runs 는 완료된 run 목록을 반환한다", async () => {
    const res = await listGET();
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      runs: Array<{ id: string; summary: string | null; connectionCount: number }>;
    };
    const mine = body.runs.find((r) => r.id === runId);
    expect(mine).toBeDefined();
    expect(mine!.summary).toBe("이것은 요약입니다.");
    expect(mine!.connectionCount).toBe(1);
  });

  it("GET /runs/[id] 는 연결 상세를 반환한다", async () => {
    const res = await detailGET(new Request("http://x"), {
      params: Promise.resolve({ id: runId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      run: {
        id: string;
        summary: string | null;
        connections: Array<{
          title: string | null;
          workTitle: string | null;
          connection: string;
          differentPerspective: string | null;
        }>;
      };
    };
    expect(body.run.id).toBe(runId);
    expect(body.run.summary).toBe("이것은 요약입니다.");
    expect(body.run.connections).toHaveLength(1);
    expect(body.run.connections[0].connection).toBe("연결 내용");
    expect(body.run.connections[0].workTitle).toBe("역사 작품");
  });

  it("다른 사용자의 run 조회는 404", async () => {
    const res = await detailGET(new Request("http://x"), {
      params: Promise.resolve({ id: otherRunId }),
    });
    expect(res.status).toBe(404);
  });

  it("존재하지 않는 run 조회는 404", async () => {
    const res = await detailGET(new Request("http://x"), {
      params: Promise.resolve({ id: "no-such-run" }),
    });
    expect(res.status).toBe(404);
  });

  it("인증 실패 시 401", async () => {
    forceAuthFail = true;
    try {
      const res = await listGET();
      expect(res.status).toBe(401);
    } finally {
      forceAuthFail = false;
    }
  });
});
