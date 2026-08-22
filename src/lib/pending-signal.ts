"use client";

export type PendingSignal = {
  ref: string; // 말씀 표시(displayCrossRef) — 기록 시드로 쓸 성구
  reaction: "still_hold"; // "마음에 남아요" 단일 신호
  at: number;
};

const KEY = "eobom_pending_signal";

/**
 * 게스트가 "마음에 남아요"를 누르면 로그인 전에 임시 저장 → 로그인 후 1회 소비.
 * 로그인 세션이 아직 없으므로 클라이언트 로컬스토리지에 보관 (개인 정보는 성구 ref뿐).
 */
export function savePendingSignal(signal: PendingSignal): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(signal));
  } catch {
    /* storage unavailable — signal lost, non-critical */
  }
}

export function readPendingSignal(): PendingSignal | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSignal;
    if (!parsed?.ref || !parsed?.reaction) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingSignal(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
