/**
 * POST /api/story-mirror/rag/runs/stream
 *
 * 이야기 거울 RAG v4.2 — SSE 스트리밍 엔드포인트.
 * 1) 동의 확인 → 2) FTS5 로컬 검색 → 3) retrieval 이벤트 →
 * 4) MiMo 스트리밍 delta → 5) complete(또는 insufficientEvidence/error).
 * 임베딩/외부 벡터 DB 없이 동작한다.
 */
import { requireApiUser } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  searchChunks,
  RAG_CORPUS_VERSION,
  RETRIEVER_VERSION,
} from "@/lib/story-mirror/rag-search";
import {
  streamMiMoGenerate,
  GENERATOR_VERSION,
} from "@/lib/story-mirror/rag-generation";

const POLICY_VERSION = "v4.2";
const MAX_CANDIDATES = 6;

const bodySchema = z.object({
  input: z.string().min(1).max(4000),
  locale: z.string().optional(),
});

type SseEvent = { event: string; data: unknown };

function sseChunk(ev: SseEvent): Uint8Array {
  const enc = new TextEncoder();
  return enc.encode(`event: ${ev.event}\ndata: ${JSON.stringify(ev.data)}\n\n`);
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  if (!auth.user) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  }
  let parsed: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    parsed = bodySchema.parse(json);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400 });
  }

  const fullUser = await db.user.findUnique({ where: { id: auth.user.id } });
  if (!fullUser) {
    return new Response(JSON.stringify({ error: "user-not-found" }), { status: 401 });
  }
  const user = fullUser;
  // 동의 게이트: 외부 생성(AI) 사용 + 명시적 외부 동의 필요
  if (!user.storyMirrorEnabled || !user.storyMirrorExternalConsent) {
    return new Response(
      JSON.stringify({ error: "story-mirror-consent-required" }),
      { status: 403 }
    );
  }

  const locale = parsed.locale ?? user.locale ?? "ko";
  const consentSnapshot = JSON.stringify({
    enabled: user.storyMirrorEnabled,
    externalConsent: user.storyMirrorExternalConsent,
    version: user.storyMirrorLastConsentVersion ?? POLICY_VERSION,
  });
  const fingerprint = `${RAG_CORPUS_VERSION}:${RETRIEVER_VERSION}:${Buffer.from(
    parsed.input
  ).toString("base64").slice(0, 64)}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: SseEvent) => controller.enqueue(sseChunk(ev));

      // 1) FTS5 로컬 검색 (권리/언어 필터, top-N)
      let candidates;
      try {
        candidates = await searchChunks(parsed.input, {
          limit: MAX_CANDIDATES,
          language: locale.startsWith("ko") ? "ko" : undefined,
          corpusVersion: RAG_CORPUS_VERSION,
        });
      } catch (e) {
        send({ event: "error", data: { message: "검색 중 오류가 발생했습니다." } });
        controller.close();
        return;
      }

      // 2) 후보 없음 → MiMo 호출 없이 종료
      if (candidates.length === 0) {
        const run = await db.storyRagRun.create({
          data: {
            userId: user.id,
            inputFingerprint: fingerprint,
            corpusVersion: RAG_CORPUS_VERSION,
            retrieverVersion: RETRIEVER_VERSION,
            generatorVersion: GENERATOR_VERSION,
            policyVersion: POLICY_VERSION,
            consentSnapshot,
            status: "insufficient_evidence",
          },
        });
        send({
          event: "insufficientEvidence",
          data: {
            runId: run.id,
            message: "연결할 수 있는 이야기를 찾지 못했습니다. 조금 더 구체적으로 적어보세요.",
          },
        });
        controller.close();
        return;
      }

      // 3) run + match(검색 결과 고정) 생성
      const run = await db.storyRagRun.create({
        data: {
          userId: user.id,
          inputFingerprint: fingerprint,
          corpusVersion: RAG_CORPUS_VERSION,
          retrieverVersion: RETRIEVER_VERSION,
          generatorVersion: GENERATOR_VERSION,
          policyVersion: POLICY_VERSION,
          consentSnapshot,
          status: "pending",
          matches: {
            create: candidates.map((c) => ({
              chunkId: c.id,
              searchScore: c.searchScore,
              confidence: c.confidence,
              state: "active",
            })),
          },
        },
      });

      send({
        event: "retrieval",
        data: {
          runId: run.id,
          candidates: candidates.map((c) => ({
            chunkId: c.id,
            title: c.title,
            workTitle: c.workTitle,
            locator: c.locator,
            excerpt: c.excerpt ?? c.summary,
            confidence: c.confidence,
          })),
        },
      });

      // 4) MiMo 스트리밍 생성 (요청당 최대 1회)
      try {
        const result = await streamMiMoGenerate(
          { userInput: parsed.input, retrieved: candidates, locale },
          { onDelta: (d) => send({ event: "delta", data: { delta: d } }) }
        );

        // 5) 생성 결과로 match 보강
        for (const conn of result.connections) {
          await db.storyRagMatch.updateMany({
            where: { runId: run.id, chunkId: conn.chunkId },
            data: {
              connection: conn.connection,
              differentPerspective: conn.differentPerspective ?? null,
            },
          });
        }
        await db.storyRagRun.update({
          where: { id: run.id },
          data: { status: "complete", completedAt: new Date(), summary: result.summary },
        });

        send({
          event: "complete",
          data: {
            runId: run.id,
            summary: result.summary,
            connections: result.connections.map((c) => {
              const src = candidates.find((x) => x.id === c.chunkId);
              return {
                chunkId: c.chunkId,
                title: src?.title,
                workTitle: src?.workTitle,
                locator: src?.locator,
                connection: c.connection,
                differentPerspective: c.differentPerspective,
              };
            }),
          },
        });
      } catch (e) {
        await db.storyRagRun.update({
          where: { id: run.id },
          data: { status: "error", failureCode: "generation_failed" },
        });
        send({
          event: "error",
          data: { runId: run.id, message: "이야기 생성 중 오류가 발생했습니다." },
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
