# 작업지시서: 동행 매칭 Provider·알림·운영 설계 보완

> 목표: 결정적 매칭을 안전한 provider 경계와 운영 가능한 요청 흐름으로 확장하되, 자동 연결·원문 공유·권위적 판단을 금지한다.
> 선행: `docs/work-orders/WO-2026-08-29-companion-qa-followup.md`

## 설계 원칙

- 매칭 실행은 사용자가 명시적으로 시작한 경우에만 수행한다.
- AI provider는 원문·entry ID·연락처·민감 신호를 받지 않는다.
- provider 결과는 서버에서 schema 검증하고 허용된 profile ID만 통과시킨다.
- provider 실패는 자동 연결이 아니라 `retryable` 또는 `no_match`로 끝난다.
- 결정적 매칭은 항상 안전한 fallback으로 남겨 둔다.
- 요청 알림은 앱 내부에서만 제공하고 외부 알림은 별도 동의 없이는 보내지 않는다.

## P4-1. Provider 계약

**대상:** `src/lib/companion-match-provider.ts`, `src/lib/companions.ts`

```ts
type MatchInput = {
  topicTags: string[];
  helpModes: string[];
  role: "peer" | "mentor" | "prayer_partner" | null;
  scopeKey: "private";
};

type ProviderCandidate = {
  profileId: string;
  signalLabels: string[];
  reasonSummary: string;
};

interface CompanionMatchProvider {
  name: string;
  generate(input: MatchInput, signal: AbortSignal): Promise<ProviderCandidate[]>;
}
```

- `deterministic` provider를 먼저 구현한다.
- 외부 AI provider는 계약·검증이 준비될 때까지 등록하지 않는다.
- 입력과 출력은 Zod 또는 동등한 런타임 검증을 거친다.
- 반환 후보 수는 3명 이하로 제한한다.
- 허용되지 않은 profile ID, 연락처, 진단·위기 표현이 포함된 결과는 폐기한다.

## P4-2. 실행 상태

**대상:** `CompanionMatchRun`, `runCompanionMatch`, 매칭 API

- feature flag가 꺼져 있으면 run을 만들지 않거나 `blocked`로 기록한다.
- 상태는 `running → succeeded | no_match | retryable | blocked`만 허용한다.
- 실행 제한 시간은 provider 단위로 적용한다.
- retry는 서버가 무한 재시도하지 않고 `retryCount`와 만료 시각을 기록한다.
- raw prompt, raw response, 내부 점수는 저장하지 않는다.
- 동의 철회 시 미완료 run은 `blocked` 처리하고 후보 근거를 삭제한다.

## P4-3. 앱 내부 요청 알림

**대상:** `CompanionNotification` 모델·서비스·동행 설정 UI

- requester가 `pending_counterparty`가 되는 최초 상태 전이 때만 알림을 만든다.
- 동일 candidate/user 조합은 unique로 중복 생성하지 않는다.
- 알림에는 후보 ID와 공개 이름·원문·entry ID·거절 사유를 넣지 않는다.
- counterparty는 설정 화면 진입 시 미읽음 요청을 확인한다.
- 수락·거절 시 알림을 읽음 처리한다.

## P5. 회고 handoff

**대상:** `review-simple-view`, `/together/companions`

- 회고 CTA는 후보를 만들지 않고 동행 설정으로 이동한다.
- URL에는 `from=review` 외에 review ID·entry ID·원문을 넣지 않는다.
- 별도 동행 동의 전에는 매칭 API를 호출하지 않는다.
- 회고 원문은 provider 입력에 사용하지 않는다.

## 운영·QA 게이트

- provider contract unit test
- timeout·invalid result·no-match·feature-off test
- 알림 중복·읽음·철회 test
- 양쪽 수락 및 경쟁 전이 test
- headed Chrome 두 세션으로 요청·수락·연결·신고·차단·종료 검증
- 360/768/1440px UI 검증
- `COMPANIONS_ENABLED` 기본 false 유지 및 canary override 검증
- 응답·로그·클라이언트에 원문·entry ID·연락처가 없는지 검증

## 비목표

- 이번 단계에서 외부 AI 모델 호출을 활성화하지 않는다.
- 자동 수락·자동 연결·자동 첫 메시지를 구현하지 않는다.
- 회고 원문을 provider에 전달하지 않는다.
- 외부 이메일·푸시 알림을 추가하지 않는다.
