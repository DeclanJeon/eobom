/**
 * Story Mirror RAG v4.2 — MiMo streaming generation (no embeddings)
 *
 * MiMo chat/completions 스트리밍으로만 사용한다(요청당 최대 1회 호출).
 * 검색 후보(3~6개)를 컨텍스트로 받아, 사용자의 상황과 문학/성경 구절 사이의
 * 연결을 부드러운 동행자 톤으로 생성한다. 점수/랭킹 금지.
 */
import { z } from "zod";
import type { RetrievedChunk } from "./rag-search";

export type RagConnection = {
  chunkId: string;
  connection: string;
  differentPerspective?: string;
};

export type RagGenerationResult = {
  summary: string;
  connections: RagConnection[];
};

export type RagGenerationInput = {
  userInput: string;
  retrieved: RetrievedChunk[];
  locale?: string;
};

const RagConnectionSchema = z.object({
  chunkId: z.string().min(1),
  connection: z.string().min(1),
  differentPerspective: z.string().optional(),
});

const RagResultSchema = z.object({
  summary: z.string().min(1),
  connections: z.array(RagConnectionSchema),
});

export const GENERATOR_VERSION = "mimo-v2.5-rag-1";

// 동행자 톤 시스템 프롬프트(브랜드: 온화, 비판단, 점수/랭킹 금지).
export function buildSystemPrompt(locale = "ko"): string {
  const ko = locale.startsWith("ko");
  if (ko) {
    return [
      "당신은 '이어봄'이라는 영적 일기 서비스의 이야기 거울 기능입니다.",
      "사용자의 회고(감정, 상황, 고민)를 부드럽고 비판단적인 동행자 톤으로 듣고,",
      "제공된 문학/성경 구절 사이에서 사용자의 상황과 연결되는 지점을 찾아주세요.",
      "규칙:",
      "- 사용자를 판단하거나 조언하듯 명령하지 마세요. 함께 바라보는 동행자 말투.",
      "- 점수, 순위, '가장 좋음' 같은 비교 표현을 쓰지 마세요.",
      "- 연결은 구체적이고 정서적으로 공감 가능하게, 1~3문장으로 쓰세요.",
      "- 반드시 제공된 후보(chunkId) 중 실제로 연결되는 것만 인용하세요. 없는 내용을 지어내지 마세요.",
      "- 응답은 반드시 아래 JSON 스키마로만 주세요(설명 금지):",
      '{"summary": "전체를 아우르는 한 줄 요약",',
      ' "connections": [{"chunkId": "...", "connection": "...", "differentPerspective": "..."}]}',
    ].join("\n");
  }
  return [
    "You are the Story Mirror feature of 'Eobom', a spiritual journaling service.",
    "Listen warmly and non-judgmentally; connect the user's reflection to the provided passages.",
    "Rules: no scores/ranking; cite only provided chunkIds; respond ONLY in JSON:",
    '{"summary":"...","connections":[{"chunkId":"...","connection":"...","differentPerspective":"..."}]}',
  ].join("\n");
}

// 검색 후보를 컨텍스트로 펼쳐 사용자 메시지를 구성한다.
export function buildUserPrompt(input: RagGenerationInput): string {
  const lines = input.retrieved.map((c, i) => {
    const ref = c.locator ? `${c.title} (${c.locator})` : c.title;
    return `[${i + 1}] chunkId=${c.id} | ${ref} | 출처=${c.workTitle}\n${c.excerpt ?? c.summary ?? c.text}`;
  });
  return [
    "사용자 회고:",
    input.userInput,
    "",
    "검색된 후보(이 중에서만 연결):",
    ...lines,
    "",
    "위 후보를 바탕으로 JSON으로 응답하세요.",
  ].join("\n");
}

export type StreamCallbacks = {
  onDelta?: (delta: string) => void;
  fetchImpl?: typeof fetch;
};

function getMiMoConfig() {
  const baseUrl = process.env.MIMO_BASE_URL ?? "https://api.xiaomimimo.com/v1";
  const apiKey = process.env.MIMO_API_KEY;
  const model = process.env.MIMO_MODEL ?? "mimo-v2.5";
  return { baseUrl, apiKey, model };
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) return candidate.slice(start, end + 1);
  return candidate.trim();
}

/**
 * MiMo 스트리밍 호출 → delta 콜백 → 전체 누적 → Zod 검증.
 * fetchImpl를 주입하면 네트워크 없이 테스트할 수 있다.
 */
export async function streamMiMoGenerate(
  input: RagGenerationInput,
  cb: StreamCallbacks = {}
): Promise<RagGenerationResult> {
  const { baseUrl, apiKey, model } = getMiMoConfig();
  const doFetch = cb.fetchImpl ?? fetch;
  if (!apiKey) throw new Error("MIMO_API_KEY가 설정되지 않았습니다.");

  const body = {
    model,
    stream: true,
    messages: [
      { role: "system", content: buildSystemPrompt(input.locale) },
      { role: "user", content: buildUserPrompt(input) },
    ],
    temperature: 0.7,
  };

  const resp = await doFetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`MiMo 호출 실패: ${resp.status} ${resp.statusText}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let acc = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") break;
      try {
        const json = JSON.parse(payload);
        const delta: string | undefined = json?.choices?.[0]?.delta?.content;
        if (delta) {
          acc += delta;
          cb.onDelta?.(delta);
        }
      } catch {
        // 부분 청크는 무시
      }
    }
  }

  return parseAndValidate(acc, input.retrieved);
}

// 누적 텍스트 → JSON 추출 → Zod 검증 → 제공된 chunkId로 인용 필터링.
export function parseAndValidate(
  raw: string,
  retrieved: RetrievedChunk[]
): RagGenerationResult {
  const jsonText = extractJson(raw);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("MiMo 응답을 JSON으로 파싱하지 못했습니다.");
  }
  const result = RagResultSchema.parse(parsed);

  const allowed = new Set(retrieved.map((c) => c.id));
  const connections = result.connections
    .filter((c) => allowed.has(c.chunkId))
    .slice(0, retrieved.length);

  return { summary: result.summary, connections };
}
