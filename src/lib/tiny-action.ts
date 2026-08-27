/**
 * 설계 05§11 Tiny Action policy + 02 Journey E.
 * - opt-in only: resurfacing에서 `아직 비슷해요`(still_hold)를 선택한 뒤에만 제안.
 * - 카탈로그는 신앙적 명령보다 생활 가능한 미세 행동 중심.
 * - 7일 뒤 follow-up. 완료/실패 언어 금지 — 상태 라벨은 action-status.ts 참조.
 */
export type TinyActionCatalogItem = {
  id: string;
  label: string;
  body: string;
};

export const TINY_ACTION_CATALOG: TinyActionCatalogItem[] = [
  { id: "reach_out", label: "먼저 연락해보기", body: "그 사람에게 먼저 연락해보기" },
  { id: "quiet_walk", label: "10분 조용히 걷기", body: "10분 조용히 걷기" },
  { id: "pray_revisit", label: "기도 후 하루 뒤 다시 보기", body: "기도하고 하루 뒤 이 기록을 다시 보기" },
];

export const TINY_ACTION_FOLLOWUP_DAYS = 7;

/** "지금은 괜찮아요" = opt-out. 직접 적기는 기록 작성으로 이동(별도 처리). */
export function findTinyAction(catalogId: string): TinyActionCatalogItem | null {
  return TINY_ACTION_CATALOG.find((item) => item.id === catalogId) ?? null;
}
