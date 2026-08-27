/**
 * src/lib/events.ts
 * Tap→Receive 개편 계측 — 이벤트 로깅 헬퍼.
 *
 * 계약 (설계 v1.3 §3.7, 최종 QA GATE·C8):
 * - meta는 ID·enum·numeric 값만 허용. 원문·성구·메모·자유 문자열 금지.
 * - dateKey는 서버에서 Asia/Seoul 기준 계산 (클라이언트 값 신뢰 금지, C9).
 * - guest는 userId 없이 seatId(키링 단위)로만 집계 — 사람 단위 추적 금지.
 * - 이 헬퍼는 서버 컴포넌트 렌더 중 호출 금지 (prefetch 오염, B4).
 *   card_impression = 클라이언트 mount → 서버 액션 경유.
 *   사용자 액션 이벤트(reaction/one_line/entry) = 액션 안에서 await 확정.
 */
import { db } from "@/lib/db";
import { toKstDateKey } from "@/lib/kst";

// KST 유틸 재수출 — 기존 import 경로(events) 호환 유지
export { toKstDateKey, kstDateKeyToStart, KST_OFFSET_MS } from "@/lib/kst";

export const EVENT_TYPES = [
  "landing_seen",
  "card_impression",
  "card_reaction",
  "one_line_saved",
  "entry_created",
  "return_landing",
  "context_selected",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const ENTRY_SOURCES = ["nfc", "qr", "link", "email", "unknown"] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

export const EVENT_RETENTION_DAYS = 90;

type MetaValue = string | number | boolean;
export type EventMeta = Record<string, MetaValue>;

const META_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,31}$/;
const META_MAX_KEYS = 16;
const META_MAX_VALUE_CHARS = 64;
// 문자열 값은 ID·enum·cardKey 형태만 (공백·CJK·원문 차단 — C8 구조 강제)
const META_STRING_RE = /^[A-Za-z0-9_:.-]{1,64}$/;

/**
 * meta 검증 — 원문/자유 문자열 유입 차단 (C8).
 * 값은 string|number|boolean만. string은 ID·enum·cardKey 패턴(공백·CJK 금지),
 * 64자 이하, 키는 영숫자 언더스코어.
 */
export function sanitizeEventMeta(meta?: EventMeta | null): string {
  const clean: Record<string, MetaValue> = {};
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (Object.keys(clean).length >= META_MAX_KEYS) break;
      if (!META_KEY_RE.test(k)) continue;
      if (typeof v === "string") {
        if (v.length > META_MAX_VALUE_CHARS) continue;
        if (!META_STRING_RE.test(v)) continue;
        clean[k] = v;
      } else if (typeof v === "number" || typeof v === "boolean") {
        clean[k] = v;
      }
    }
  }
  return JSON.stringify(clean);
}

export function isEventType(v: string): v is EventType {
  return (EVENT_TYPES as readonly string[]).includes(v);
}

export function isEntrySource(v: string): v is EntrySource {
  return (ENTRY_SOURCES as readonly string[]).includes(v);
}

export type LogEventInput = {
  userId?: string | null;
  seatId?: string | null;
  eventType: EventType;
  entrySource?: EntrySource | string;
  experimentId?: string | null;
  variant?: string | null;
  meta?: EventMeta | null;
  /** 로깅 실패를 삼킬지 여부 — 비핵심 이벤트(true)는 실패해도 흐름 유지. */
  fireAndForget?: boolean;
};

/**
 * 이벤트 1건 기록. dateKey는 서버 KST로 계산.
 * fireAndForget=false(기본)면 DB 오류를 호출자에게 전파 — 핵심 이벤트는 await 확정 (B4).
 * 호출 위치: 서버 액션·라우트 핸들러·클라이언트→액션 경유만. 서버 컴포넌트 렌더 금지.
 */
export async function logEvent(input: LogEventInput): Promise<void> {
  const run = async () => {
    if (!isEventType(input.eventType)) {
      throw new Error(`unknown eventType: ${input.eventType}`);
    }
    const source = input.entrySource && isEntrySource(input.entrySource)
      ? input.entrySource
      : "unknown";
    await db.eventLog.create({
      data: {
        userId: input.userId ?? null,
        seatId: input.seatId ?? null,
        eventType: input.eventType,
        dateKey: toKstDateKey(new Date()),
        entrySource: source,
        experimentId: input.experimentId ?? null,
        variant: input.variant ?? null,
        meta: sanitizeEventMeta(input.meta),
      },
    });
  };

  if (input.fireAndForget) {
    try {
      await run();
    } catch {
      // 계측 실패가 사용자 흐름을 깨지 않게 한다. (운영 로그는 콘솔로만)
      console.error("[events] logEvent failed (fireAndForget)", input.eventType);
    }
    return;
  }
  await run();
}
