/**
 * src/lib/weekday-rhythm.ts
 * 요일 리듬 (G012, v1.3 §3.1 Phase 3) — "재탭 이유" 7종.
 *
 * KST 요일 매핑 (toKstParts 기반):
 * - 월(1): 오늘의 말씀 (기존 selectRandomScripture)
 * - 화(2): 20초 질문 (정적 풀 — AI 호출 0, C7 준수)
 * - 수(3): 지난주 내 한 문장 (최근 7일 기록)
 * - 목(4): 오늘의 작은 실천 (열린 결단)
 * - 금(5): 나에게 보내는 메시지 (타임캡슐 N일 전)
 * - 토(6): 이번 주 돌아보기 (기존 회고 링크만 — 신규 AI 요약 금지, C7)
 * - 주일(0): 이번 주 감사 (gratitude 모음)
 *
 * 신학 안전: 질문은 정적·비처방. AI 요약 생성 금지.
 */
import { toKstParts } from "@/lib/kst";
import { hashToIndex } from "@/lib/daily-scripture";

export type WeekdayContentKey =
  | "scripture"
  | "prompt"
  | "last_week"
  | "action"
  | "time_capsule"
  | "review"
  | "gratitude";

/** KST 요일 → 콘텐츠 키. getDay(): 0=일, 1=월, ..., 6=토. */
export function weekdayContentKey(now: Date): WeekdayContentKey {
  const kst = toKstParts(now);
  const day = new Date(Date.UTC(kst.year, kst.month - 1, kst.day)).getUTCDay();
  switch (day) {
    case 0: return "gratitude"; // 주일
    case 1: return "scripture"; // 월
    case 2: return "prompt"; // 화
    case 3: return "last_week"; // 수
    case 4: return "action"; // 목
    case 5: return "time_capsule"; // 금
    case 6: return "review"; // 토
    default: return "scripture";
  }
}

let promptPool: string[] | null = null;

async function loadPromptPool(): Promise<string[]> {
  if (promptPool) return promptPool;
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const raw = readFileSync(join(process.cwd(), "data", "today-prompts.json"), "utf8");
  promptPool = JSON.parse(raw) as string[];
  if (!Array.isArray(promptPool) || promptPool.length === 0) {
    throw new Error("today-prompts.json 질문 풀이 비어 있습니다.");
  }
  return promptPool;
}

/** 테스트 seam — 풀 재로드. */
export function resetPromptPoolForTests(): void {
  promptPool = null;
}

/** KST dateKey 시드로 결정적 질문 1개 (운세적 해석 없음 — 정직한 20초 질문). */
export async function selectPrompt(dateKey: string): Promise<string> {
  const pool = await loadPromptPool();
  return pool[hashToIndex(dateKey, pool.length)]!;
}
