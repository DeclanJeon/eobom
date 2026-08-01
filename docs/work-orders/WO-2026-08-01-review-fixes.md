# 작업지시서: 코드 리뷰 후속 개선 (Security/Infra/Test) v1

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-08-01 |
| 설계 | 전원 코드 리뷰 결과 (별도 설계문서 없음 — 개별 수정) |
| 상태 | 진행 전 |
| 선행 | 키링 WO·돌아보기 WO와 병행 가능 (파일 충돌 없음) |

---

## 1. 목표

2026-08-01 전원 코드 리뷰에서 발견된 HIGH/MEDIUM 이슈 중 **오늘 진행할 것**을 선별해 수정한다.

- CRITICAL: 0 (확인 완료)
- HIGH: 8건 중 **5건을 오늘 수정**, 나머지는 다음 스프린트
- MEDIUM: 10건 중 **5건을 오늘 수정**, 나머지는 다음 스프린트

## 2. 범위

### In (오늘 진행)

| # | severity | 이슈 | 위치 |
|---|---|---|---|
| R1 | HIGH | SSH 셸 주입 (조건부 RCE) | `src/lib/story-mirror/image-gen.ts:70-83` |
| R2 | HIGH | 테스트 병렬 경합 P2021 (테스트 DB 미분리) | `tests/story-mirror-rag*.test.ts`, `package.json` |
| R3 | HIGH | 캐시 fingerprint에 `updatedAt` 미반영 (stale 미검출) | `src/lib/story-mirror/cache.ts:14-22`, `user-profile.ts:22` |
| R4 | HIGH | 외부 API fetch 타임아웃·재시도 부재 (4곳) | `mimo.ts:302`, `together-tags.ts:217`, `rag-generation.ts:134`, `visualization-brief.ts:213` |
| R5 | HIGH | rate-limit 미등재 API 2곳 | `visualize/route.ts:31`, `rag/runs/stream/route.ts:37` |
| R6 | MEDIUM | 로그인 redirect open-redirect (callbackUrl 무검증) | `src/app/login/page.tsx:15` |
| R7 | MEDIUM | uploads API가 redirect 기반 `requireUser` 사용 (JSON 401 불일치) | `src/app/api/uploads/route.ts:25`, `uploads/[name]/route.ts:22` |
| R8 | MEDIUM | 시각화 API 150초 동기 블록 (`execFileSync`) | `visualize/route.ts:113` |
| R9 | MEDIUM | 피드백 GET 실패 시 POST 미실행 (무용 GET 제거) | `story-mirror-feedback.tsx:25-31` |
| R10 | MEDIUM | runs N+1 쿼리 (최대 25회 findFirst) | `runs/route.ts` |

### Out (다음 스프린트)

- deploy.sh 백업·`bun install` 누락 (R11, R12 — 배포 시점에 검증하며 적용)
- entry-form `router.back()` 히스토리 보강
- eobom.service EnvironmentFile 우선순위
- actions.ts backfill N+1 + `@@unique` 마이그레이션
- 미사용 의존성 7개 제거, 미사용 컴포넌트 정리
- robots/middleware 계층 정리 (`/lookback`, `/story-mirror` — 돌아보기 WO T7과 연계)

---

## 3. 작업 분해

### R1. SSH 폴백 셸 주입 제거
**파일:** `src/lib/story-mirror/image-gen.ts:70-83`

- `execFileSync(ssh, [...])` 배열 인자로 변경 — 셸 문자열 해석 제거
- `escapedPrompt` 작은따옴표 이스케이프는 셸 경로에서 불필요해짐 → prompt를 배열 인자로 직접 전달
- 검증: 이미지 생성 e2e 1회 (실제 ssh 폴백 경로)

### R2. 테스트 DB 분리
**파일:** `package.json`(test 스크립트), `tests/`, `.env.test`(신규), 필요시 `tests/setup.ts`

- `DATABASE_URL_TEST` (또는 `DATABASE_URL` 재정의)로 **테스트 전용 DB** 지정 (`db/eobom-test.db` 등)
- `pretest`: `prisma db push`로 테스트 DB 스키마 동기화
- RAG 테스트 3종이 `ensureRagFts5()`(drop/recreate 포함)를 병렬 호출하는 경합 해소:
  - 테스트별 격리: `beforeAll`에서 1회만 초기화하거나, 테스트간 순차 실행(`--runInBand` 계열) 또는 lock
- `bun test` 전체 실행 시 P2021 미발생 확인

### R3. fingerprint payload에 updatedAt 반영
**파일:** `src/lib/story-mirror/cache.ts:14-22`, `src/lib/story-mirror/user-profile.ts:22`

- `EntryForProfile`에 `updatedAt` 포함
- `computeInputFingerprint` payload에 `updatedAt` 추가 (기록 수정 시 stale 검출)
- 시각화 fingerprint 테스트 갱신 (`tests/visualization-fingerprint.test.ts`)
- 검증: 기록 수정 → freshness가 stale로 전환되는 테스트 추가

### R4. 외부 API 타임아웃
**파일:** `src/lib/mimo.ts:302`, `src/lib/story-mirror/together-tags.ts:217`, `src/lib/story-mirror/rag-generation.ts:134`, `src/lib/story-mirror/visualization-brief.ts:213`

- 공용 헬퍼(`fetchWithTimeout`) 추가 또는 각 fetch에 `AbortSignal.timeout(N)` 적용 (예: 30s)
- 실패 시 상위 에러 처리 경로 확인 (기존 try/catch 재사용)

### R5. rate-limit 등재
**파일:** `src/app/api/story-mirror/visualize/route.ts:31`, `src/app/api/story-mirror/rag/runs/stream/route.ts:37`

- 기존 `RATE_LIMITS` 구조 확인 후 두 라우트를 등재
- (rate-limit 유틸이 없다면 기존 패턴 재사용 — 다른 API의 rate-limit 구현 확인 후 동일 적용)

### R6. login redirect 검증
**파일:** `src/app/login/page.tsx:15`

- `callbackUrl`이 `/`로 시작하고 `//`로 시작하지 않을 때만 사용
- 외부/잘못된 값 → `/today` 폴백

### R7. uploads API 401 JSON
**파일:** `src/app/api/uploads/route.ts:25`, `src/app/api/uploads/[name]/route.ts:22`

- `requireUser`(redirect) → `requireApiUser`(401 JSON)로 교체
- `reflection-editor.tsx:52`의 fetch 호출이 401을 처리하는지 확인

### R8. 시각화 동기 블록 제거
**파일:** `src/app/api/story-mirror/visualize/route.ts:113`

- `execFileSync` → async 경로로 전환 (이미지 생성 자체는 서버에서 동기 실행이 불가피하면, 150초 제한을 우회하는 구조 확인)
- 대안: 생성 작업을 queue/비동기로 분리하는 대신, 타임아웃을 늘리되 요청이 블로킹되는 구조를 명시 — **최소 수정: `execFileSync` 인자에서 셸 제거 + 타임아웃 설정**

### R9. 피드백 무용 GET 제거
**파일:** `src/components/story-mirror-feedback.tsx:25-31`

- 마운트 시 GET 호출 제거 (POST 실행 전 실패를 막는 가드가 GET 성공에 의존하는 구조 해소)
- 필요하면 로컬 상태로 가드

### R10. runs N+1 해소
**파일:** `src/app/api/story-mirror/rag/runs/route.ts`

- `findFirst` 루프 → `findMany` 1회 + Map 조회로 변경

---

## 4. 수용 기준

1. R1: `image-gen.ts`에 셸 문자열 명령이 없음 (grep으로 `execSync\(` 문자열 인자 0건)
2. R2: `bun test` 전체 실행 시 P2021 미발생, 227 pass 유지
3. R3: 기록 수정 시 freshness stale 전환 테스트 통과
4. R4: fetch 호출 4곳에 타임아웃 적용 확인
5. R5: rate-limit 등재 2곳 확인
6. R6: `callbackUrl=https://evil.com` → `/today`로 리다이렉트 (단위/수동 확인)
7. R7: uploads 미인증 시 401 JSON 응답
8. R8: visualize 라우트에 셸 문자열 명령 없음
9. R9: feedback 컴포넌트에 마운트 GET 없음
10. R10: runs 라우트 쿼리 1회 + Map (코드 확인)
11. `tsc --noEmit` + 전체 테스트 통과

---

## 5. 구현 노트

- **리뷰 문맥**: 이어봄 코드베이스는 인증·Zod 검증·소유권 검사·동의 게이트가 견고. 본 WO는 인프라/보안/테스트 최소 보강.
- R1의 셸 주입은 **운영 경로는 안전**(execFileSync 배열)하고 SSH 폴백 경로만 위험 → 폴백 경로를 배열 인자로 통일.
- R2는 로컬 실패 테스트(1건)의 근본 원인. **우선 순위 1위** — 다른 수정의 검증(전체 테스트)을 막고 있음.
- 배포 관련(deploy.sh)은 다음 배포 시 검증하며 적용 (오늘은 문서화만).
- 파일 충돌: 키링 WO·돌아보기 WO와 겹치는 파일 없음 (`image-gen.ts` 제외 — 키링 WO와 무관).

---

## 6. DoD 체크

- [ ] R1 셸 주입 제거 (배열 인자)
- [ ] R2 테스트 DB 분리 + P2021 해소 (`bun test` 전체 pass)
- [ ] R3 fingerprint updatedAt + stale 테스트
- [ ] R4 fetch 타임아웃 4곳
- [ ] R5 rate-limit 2곳
- [ ] R6 open-redirect 수정
- [ ] R7 uploads 401 JSON
- [ ] R8 visualize 셸 제거
- [ ] R9 feedback GET 제거
- [ ] R10 runs N+1 해소
- [ ] tsc clean + 전체 테스트 pass
- [ ] 커밋·푸시 (별도 커밋 단위로 분리)
