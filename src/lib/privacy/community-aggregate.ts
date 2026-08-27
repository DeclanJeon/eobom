/**
 * 설계 06§7 Community Guardrails — k-anonymity 최소 표본 게이트.
 * `최근 N명이 ~에 머물렀어요` 류의 community aggregate는 이 게이트를 통과해야만
 * 노출할 수 있다. 소규모 교체 재식별 위험을 줄이기 위해 초기 n ≥ 10.
 */
export const COMMUNITY_AGGREGATE_MIN_SAMPLE = 10;

export function canPublishCommunityAggregate(sampleSize: number): boolean {
  return Number.isInteger(sampleSize)
    && sampleSize >= COMMUNITY_AGGREGATE_MIN_SAMPLE;
}

export function communityAggregateSuppressedCopy(): string {
  return "아직 함께하는 사람들이 충분히 모이지 않아 요약을 보여드리지 않아요.";
}
