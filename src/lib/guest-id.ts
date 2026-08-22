import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

export const GUEST_ID_COOKIE = "eobom_guest_id";
export const GUEST_ID_MAX_AGE = 365 * 24 * 60 * 60; // 1년

/**
 * 게스트 브라우저 식별자 — 로그인하지 않은 방문자의 신규/재방문 구분용.
 * - 로그인 소유자 기기 식별(DEVICE_COOKIE/UserDevice)과 별개로, 미로그인 게스트용 익명 쿠키.
 * - 개인 정보 없음: 발급 시각 기준 uuid. 서버 컴포넌트에서는 읽기만, 쓰기는 Route Handler/미들웨어에서.
 */
export async function getGuestId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(GUEST_ID_COOKIE)?.value ?? null;
}

export function newGuestId(): string {
  return randomUUID();
}
