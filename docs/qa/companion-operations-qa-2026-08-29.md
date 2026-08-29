# 동행 운영 QA 테스트 문서

- 기준일: 2026-08-29 (KST)
- 대상: 동행 프로필, 후보 생성, 연결, 메시지, 안전 처리, E2E 격리
- 목적: 운영 활성화 전 남은 운영 준비 항목을 재현 가능한 시나리오로 검증한다.

## 사전 조건

- production build 성공
- 테스트 DB는 개발 DB와 분리
- `COMPANIONS_ENABLED` 기본값은 `false`
- 테스트 계정·후보·메시지는 QA 전용 DB에서만 생성

## 시나리오

### O1. Feature flag / canary

1. flag 미설정 상태에서 매칭 요청
2. 후보가 생성되지 않고 `blocked` 또는 안전한 빈 결과인지 확인
3. QA 전용 환경에서만 `COMPANIONS_ENABLED=true` 설정
4. 후보 생성 후 다른 환경에는 영향이 없는지 확인
5. flag를 다시 끄고 새 후보 생성이 중단되는지 확인

### O2. 개인정보 경계

1. 후보 API 응답에 `userId`, `matchedUserId`, `supportingEntryIds`, 원문이 없는지 확인
2. 공개 프로필에 연락처·외부 링크·위기·민감 신호를 입력
3. 응답에서 해당 값이 제거되는지 확인
4. 로그에 prompt·raw response·내부 점수가 없는지 확인
5. 동의 철회 후 미연결 후보의 근거 ID가 삭제되는지 확인

### O3. 연결 상태와 멱등성

1. A가 후보 생성·수락
2. B가 incoming 요청 확인·수락
3. 양쪽 수락 전 `connected`가 아닌지 확인
4. 양쪽 수락 후 연결이 정확히 하나인지 확인
5. 같은 수락 요청을 반복
6. 중복 연결·중복 알림이 생성되지 않는지 확인

### O4. 안전 종료

1. 연결 후 신고
2. 신고만으로 연결이 종료되지 않는지 확인
3. 차단 후 양쪽에서 상대가 숨겨지는지 확인
4. 종료 후 메시지 전송이 차단되는지 확인
5. 중복 차단·신고가 안전하게 처리되는지 확인

### O5. 메시지·rate limit

1. 정상 메시지 전송·수신
2. 연락처·외부 링크·위기 표현 전송
3. 메시지가 거절 또는 moderation 상태로 처리되는지 확인
4. 분당·일일 상한 초과 시 429인지 확인
5. 상대방이 차단된 뒤 메시지 조회·전송이 거절되는지 확인

### O6. 회고 handoff

1. 회고 화면에서 동행 CTA 선택
2. URL에는 `from=review`만 있고 review/entry ID가 없는지 확인
3. 별도 동의 전 매칭 API가 호출되지 않는지 확인
4. 직접 동의 후 직접 매칭을 눌러야 후보가 생성되는지 확인

### O7. 배포·복구

1. `bun run build` 성공
2. standalone 서버 시작 및 `/api/health` 200
3. 일반 페이지와 동행 페이지 응답 확인
4. feature flag off 상태에서 안전한 fallback 확인
5. DB push/deploy 스크립트가 QA·운영 DB를 혼동하지 않는지 확인
6. 실패 시 flag off로 즉시 복구 가능한지 확인

## 통과 기준

- O1~O7의 보안·상태·복구 검증 모두 통과
- 개발 DB 오염 없음
- 전체 테스트·E2E·build 통과
- 실패 시 재현 명령과 원인을 기록

## 결과 기록

| ID | 결과 | 증거 | 비고 |
|---|---|---|---|
| O1 | 통과 | `runCompanionMatch` flag-off → `blocked` | 전역 flag는 계속 false |
| O2 | 부분 통과 | 공개 projection·철회 삭제 테스트 통과 | 운영 로그 감사는 별도 필요 |
| O3 | 통과 | 단위 테스트·headed 두 세션·E2E | 경쟁 요청은 자동 테스트 기준 |
| O4 | 통과 | 신고·차단·종료 회귀 테스트 | 신고는 연결을 종료하지 않음 |
| O5 | 통과 | 메시지 필터·분당/일일 rate limit | 외부 연락처 전송 차단 |
| O6 | 통과 | `from=review` handoff·별도 동의 UI | review/entry ID 미전달 |
| O7 | 통과 | production build·standalone `/api/health` 200 | QA 전용 DB 사용 |

## 비목표

- 운영 DB에서 파괴적 migration 또는 테스트 데이터 생성
- 외부 AI provider 실제 호출
- 실제 사용자에게 feature flag 전역 활성화
- 실제 연락처·민감 원문 입력
