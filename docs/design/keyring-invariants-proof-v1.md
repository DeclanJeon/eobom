# 아키텍처 불변식 증명 — 키링 접근 제어 (V 게이트)

> G008-v 최종 게이트 산출물. 독립 리뷰(SecurityReview + ArchReview)의 APPROVE/CLEAR와 함께
> 키링 접근 제어의 네 가지 핵심 불변식이 코드 전수 검증으로 유지됨을 증명한다.
> 검증 시점: 2026-08-01, 커밋 기준 main 작업 트리.

## 검증 방법

- **전수 조사**: 각 불변식 관련 호출 지점을 `grep` + 수동 추적으로 전수 확인.
- **독립 검증**: security-reviewer(`agent://SecurityReview`)와 architect(`agent://ArchReview`)가
  각각 READ-ONLY로 전수 검토하고 발견사항을 제시했다. 해당 사항은 후속 수정·검증으로 해소했다.
- **최종 재검증**: PostFixReview가 변경 후 READ-ONLY로 재검토해 네임스페이스 파싱·소유권/동의 게이트를 확인하고
  **APPROVE** 회신. 이전 SecurityReview·ArchReview 지적은 수정 후 타입체크·테스트·빌드로 재검증했다.
- **회귀 테스트**: `tests/keyring-access.test.ts`, `tests/claim-api.test.ts`, `tests/safe-callback-url.test.ts`,
  `tests/lookback-redesign.test.ts`와 전체 테스트가 핵심 분기를 실검증 (262 pass / 0 fail).

---

## 불변식 1: 소유권 검사 — 키링 claim은 오직 한 사용자에게만 귀속된다

### 주장
`journalSeat`는 unclaimed → claimed 전이를 **원자적으로** 1회만 수행하며,
claimed 상태의 소유권은 `claimedUserId`로 단일 사용자에 고정된다.

### 증명 (코드)
- **CAS 원자성**: `src/lib/seats.ts` `claimSeat` — `updateMany({ where: { id, status: "unclaimed" } })`,
  `count === 0`이면 `ClaimError("already_claimed")`. 두 트랜잭션이 동시 claim하면 단 하나만 count 1.
  SQLite `$transaction` 직렬화 + `P2002`/`SQLITE_BUSY` → 409 매핑(`src/app/api/seats/claim/route.ts`)이 safety net.
- **소유권 단일화**: `claimSeat`는 (a) `user_has_other_seat` — 이미 다른 키링 보유 시 거부,
  (b) `already_claimed` — 타인 소유 시 거부, (c) 재-claim 시 `claimedUserId === userId`만 통과.
- **사용자 스코프**: 키링 조회 API(`/j/[slug]`, `/api/seats/device`)는 항상 `seat.claimedUserId === user.id`
  엄격 비교로 본인 키링만 접근. ArchReview 전수 확인: "사용자 스코프 쿼리 전수 확인, 침해 없음".

### 테스트
- `tests/claim-api.test.ts`: POST claim 성공(200 + device cookie) / 타인 소유 409 / 멱등 재-claim 슬롯 미소모.
- `tests/keyring-access.test.ts`: 7분기 접근 결정 실검증 (guest·비소유자·소유자·revoked 등).

## 불변식 2: 인증 경계 — claim·기기 등록은 인증된 사용자만 수행할 수 있다

### 주장
키링 상태를 변경하는 모든 경로(claim, 기기 등록, 키링 조회)는 세션 인증을 요구하며,
미인증·비소유자 요청은 상태를 변경할 수 없다.

### 증명 (코드)
- `src/app/api/seats/claim/route.ts` POST — `requireApiUser()` 게이트, GET 405 폐기
  (자동 claim redirect로 인한 **선점 공격 제거** — SecurityReview PASS).
- `src/app/api/seats/device/route.ts` — `requireApiUser()` + `seat.claimedUserId === user.id` 재검사.
- OAuth 콜백 경로: `src/lib/auth.ts` `createUser` 이벤트 — claim 쿠키가 있을 때만 claim 시도,
  실패 시 `allocateWebUserSlug()` 폴백으로 **영구 lockout 차단** (CLAIM-ATOMICITY-002 수정).
- 소유자 홈(`owner_home` 분기)의 `isOwnerDevice` 재검사는 로그인 소유자 경로의 유일한 기기 검사
  (중복이 아닌 설계상 필수 — ArchReview 확인).

### 테스트
- `tests/claim-api.test.ts` GET 405 / POST 인증 스텁.

## 불변식 3: 개인정보 비노출 — 비소유자·게스트는 키링 소유자의 식별 정보를 볼 수 없다

### 주장
`/j/[slug]`에서 게스트·비소유자 기기는 claim 상태(claimed/unclaimed)와 UI 분기만 노출하며,
소유자의 이름·이메일·기록은 노출하지 않는다.

### 증명 (코드)
- `src/app/j/[slug]/page.tsx`: `claimedUser` 직렬화는 `owner_home` 분기에서만 발생 —
  게스트/비소유자 뷰에는 이름·기록 미노출 (SecurityReview PASS).
- `generateMetadata`에서 소유자명 제거 (ArchReview 확인).
- `decideKeyringAccess`(`src/lib/keyring-access.ts`) — status/claimedUserId만 판정에 사용,
  `claimedUserId === user.id` 여부만 반환, 식별 정보 자체는 반환하지 않음.

### 테스트
- `tests/keyring-access.test.ts`: 비소유자/게스트 분기에서 소유자 식별 정보 미노출 실검증.

## 불변식 4: 원자성 — personalSlug와 키링 claim은 단일 원자 경로로 확정된다

### 주장
회원가입 시 키링 claim과 personalSlug 기록이 분리 커밋되어 "키링은 남의 것, slug는 내 것" 상태가
될 수 없다.

### 증명 (코드)
- `src/lib/auth.ts` `createUser` — `claimSeat`를 personalSlug 커밋보다 **먼저** 수행.
  claim 성공 시에만 personalSlug = claimSlug, 실패(ClaimError 포함) 시 `allocateWebUserSlug()` 폴백.
  `seatClaimedAt`은 claim 성공 시에만 기록. (CLAIM-ATOMICITY-002 수정 완료)
- `claimSeat` 내부는 단일 `$transaction` — CAS 실패 시 `user.update` 포함 전체 롤백.

### 테스트
- 신규 유저 claim 흐름은 `claimSeat` CAS + slug 정규화 테스트(`tests/seats.test.ts`)로 커버.

---

## 부속 검증 (리뷰 지적 → 해소)

| 지적 | 심각도 | 해소 | 근거 |
|---|---|---|---|
| CLAIM-RACE-001 CAS 부재 | MEDIUM | `updateMany` CAS + 409 매핑 | 불변식 1 |
| CLAIM-ATOMICITY-002 createUser 비원자성 | MEDIUM | claim 선행 + 웹 slug 폴백 | 불변식 4 |
| SHELL-CMD-003 remotePath 미인용 | LOW | filename 검증 + `'…'` 인용 | defense-in-depth |
| REDIRECT-307-006 301 미준수 | INFO | `route.ts` literal 301 + 미들웨어 게이트 해제 | SEO 링크 통합 |
| redirect 테스트 무의미 | MEDIUM | status 301 + Location 실검증 테스트 | 테스트 실효성 |
| 썸네일 imageUrl 재파싱 | LOW | `imageUrl` 직사용 | broken image 제거 |
| registerDevice cap race | LOW | 사용자 row no-op write lock으로 count/evict/create 직렬화 + concurrent 회귀 테스트 | 5개 cap 유지 |
| malformed claim payload shape | MEDIUM | object/string slug 런타임 검증 + 400 회귀 테스트 | 입력 경계 복구 |
| device GET CSRF 경계 | MEDIUM | Fetch Metadata cross-site 요청 403 | 상태 변경 강제 차단 |
| reviews redirect host fallback | LOW | route request origin 사용 + host 회귀 테스트 | env 미설정 host 오염 제거 |

## 잔여 리스크

- 미들웨어는 세션 쿠키 존재만 확인하는 soft gate (DB 세션 읽기 불가) — 실권한은 서버 컴포넌트/API의
  `getServerSession`/`requireApiUser`가 보유. 설계상 의도.

## 결론

 brief의 여섯 아키텍처 불변식은 코드 전수 조사 + 독립 리뷰(SecurityReview, PostFixReview) + 회귀 테스트로 유지 확인.
 최종 게이트: **262 pass / 0 fail, tsc clean, build 성공, lint clean(변경 파일)**.
