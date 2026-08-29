# 작업지시서: 동행 기능 QA 후속 보완 v1

> 기준: 2026-08-29 headed Chrome 두 세션 QA
> 관련 설계: `docs/design/connected-companion-experience-v1.md`
> 관련 작업지시서: `docs/work-orders/WO-2026-08-28-connected-companion-experience.md`
> 목표: 실제 사용자 시나리오에서 확인된 동행 연결·안전·E2E 격리 문제를 보완하고 운영 전 검증 기준을 고정한다.

## QA에서 확인된 사실

- 두 세션에서 프로필 설정, 후보 생성, 양쪽 수락, 연결, 메시지 송수신은 동작했다.
- `report` 요청이 연결을 종료시켜 이후 `block`이 실패하는 상태 전이 버그를 발견했고 수정했다.
- 현재 후보가 방향별로 별도 생성되므로 양쪽 사용자가 각각 후보 찾기를 실행해야 같은 관계를 볼 수 있다.
- E2E webServer의 임시 DB와 테스트 파일의 Prisma 클라이언트가 서로 다른 `DATABASE_URL`을 사용한다.
- 동행 기능은 `COMPANIONS_ENABLED`가 기본 `false`이며 외부 AI 후보 생성은 아직 없다.

## P1. 후보 요청의 양방향 대칭성

**대상:** `src/lib/companions.ts`, `src/components/companion-panel.tsx`, 관련 API·테스트

- incoming `pending_counterparty` 후보를 사용자가 직접 매칭을 다시 실행하지 않아도 조회한다.
- 기존 역방향 후보가 있으면 새 방향 후보를 중복 생성하지 않고 동일 pair 후보를 사용한다.
- 후보 projection은 현재 viewer 기준으로 공개 프로필과 이유 문장을 올바르게 선택한다.
- 한쪽 거절·철회는 해당 pair의 대기 요청을 재노출하지 않는다.

**완료 조건:** A가 요청하고 B가 설정 화면을 열기만 해도 수락 가능한 요청이 보이며, 같은 두 사용자의 후보가 방향별로 중복되지 않는다.

## P2. 안전 상태 회귀

**대상:** `src/lib/companions.ts`, `tests/companion-state.test.ts`

- `report`는 신고 이벤트만 기록하고 연결 상태를 유지한다.
- `block`은 연결과 후보를 숨기고 재노출을 막는다.
- `end`는 연결만 종료한다.
- 신고 후 차단, 중복 신고, 중복 차단, 종료 후 재요청을 테스트한다.
- 안전 이벤트의 상대방 노출 데이터와 moderation 데이터를 분리한다.

**완료 조건:** 신고·차단·종료 순서가 달라도 권한 오류 없이 정책에 맞는 최종 상태가 된다.

## P3. E2E DB 격리

**대상:** `scripts/with-e2e-db.mjs`, `playwright.config.ts`, `tests/e2e/5routes.spec.ts`

- webServer가 생성한 임시 DB 경로를 Playwright 테스트 프로세스에도 전달한다.
- 테스트 Prisma 클라이언트가 개발 DB를 절대 사용하지 않게 한다.
- 테스트 종료 후 임시 DB를 정리한다.
- 기존 seed corpus와 FTS 초기화 동작을 유지한다.

**완료 조건:** 전체 E2E가 동일 임시 DB에서 실행되고 개발 DB를 변경하지 않는다.

## P4. AI 후보 생성 준비

**대상:** `src/lib/companions.ts`, 신규 제한적 adapter·테스트

- AI 호출 전용 adapter와 결정적 fallback을 분리한다.
- 입력은 공개·구조화 신호만 허용한다.
- timeout, invalid candidate, no-match, retryable 상태를 정의한다.
- raw prompt, raw response, 내부 점수는 저장하지 않는다.
- 운영 플래그는 기본 false로 유지하고 canary 환경에서만 켠다.

**완료 조건:** AI 실패가 자동 연결이나 개인정보 노출로 이어지지 않는다.

## P5. 회고 연결 동의

**대상:** `src/components/review/review-simple-view.tsx`, 동행 진입 UI/API

- 회고 화면의 CTA는 후보를 자동 생성하지 않고 동행 설정으로 이동한다.
- 회고 원문을 매칭 입력으로 재사용하지 않는다.
- 재사용이 필요해질 때 별도 동의와 최소 신호 변환을 먼저 추가한다.

**완료 조건:** 회고 완료만으로 후보가 노출되지 않는다.

## 검증 게이트

- `bun run test:isolated`
- `bunx tsc --noEmit`
- `bun run lint`
- `bun run build`
- `bunx playwright test`
- headed Chrome 두 세션: 요청·수락·연결·메시지·신고·차단·종료
- 360px, 768px, 1440px에서 주요 CTA와 안전 조작 확인
- 개발 DB에 테스트 레코드가 남지 않는지 확인

## 비목표

- 자동 연결 또는 자동 수락
- 연락처·외부 링크 공개
- 첫 메시지 자동 전송
- 위기·의료·법률·상담 문제를 AI가 해결
- raw prompt·모델 점수·원문 기록 저장
- `COMPANIONS_ENABLED=true`를 검증 전 전역 활성화
