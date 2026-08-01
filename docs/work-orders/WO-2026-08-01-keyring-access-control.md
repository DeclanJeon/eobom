# 작업지시서: 키링 URL 접근제어 + 기기등록 v1

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-08-01 |
| 설계 | `docs/design/keyring-access-control-v1.md` |
| 상태 | 진행 전 |

---

## 1. 목표

키링 URL(`/j/e01`~`e10000`)을 **소유자만 접근 가능한 개인 페이지**로 만든다.

- claimed 키링은 소유자 이외 누구도 내용을 볼 수 없다.
- **기기등록**으로 링크 진입 즉시 본인 기기 여부를 판별한다.
- 미로그인 소유자는 로그인만 유도한다.
- 첫 등록자는 명확한 등록 흐름을 거친다.
- **자동 claim(선점)을 제거**해 순차 번호 추측 공격을 차단한다.

## 2. 범위

### In
- `UserDevice` 모델 (Prisma) + DB push
- 기기 토큰 발급·검증 유틸 (`src/lib/seats.ts` 확장)
- `/j/[slug]` 접근 분기 재작성 (자동 claim 제거, 4분기)
- claim API: POST 성공 시 기기 토큰 쿠키 발급, GET 405
- UI 3뷰: `ClaimPromptView` / `OwnerLoginPromptView` / `PrivatePageView`
- `generateMetadata` 소유자명 제거
- 단위·API 테스트

### Out
- 기기 목록 관리 UI (`/me` 설정 — 다음 스프린트)
- 키링 양도/해지 UI
- 다중 키링 소유
- NFC 하드웨어 연동

---

## 3. 작업 분해

### T1. `UserDevice` 모델 추가
**파일:** `prisma/schema.prisma`

- `UserDevice`: `id`, `userId`, `tokenHash @unique`, `label?`, `lastSeenAt?`, `createdAt`, `revokedAt?`
- `@@index([userId])`, `user` 릴레이션 `onDelete: Cascade`
- 로컬 DB `bunx prisma db push` (dev)

### T2. 기기 토큰 유틸 확장
**파일:** `src/lib/seats.ts`

- `generateDeviceToken()` → `{ token: string; tokenHash: string }` (32B random, base64url; SHA-256 해시)
- `getDeviceTokenHash(cookieHeader: string | null): string | null`
- `isOwnerDevice(userId: string, tokenHash: string | null): Promise<boolean>`
  - `revokedAt: null` 행 존재 여부 확인
- `registerDevice(userId, token, label?): Promise<UserDevice>`
  - 사용자당 활성 기기 ≤ 5, 초과 시 최고(最古) revoke

### T3. `/j/[slug]` 접근 분기 재작성
**파일:** `src/app/j/[slug]/page.tsx`

- `getDeviceTokenHash(cookies())` — Next.js `cookies()` 사용
- 분기 순서: revoked → unclaimed(viewer 유무) → claimed(viewer 본인/타인/게스트+기기)
- **unclaimed + 로그인 사용자 = 자동 redirect 제거**, `ClaimPromptView` 렌더링
- **claimed + 게스트 + 소유자 기기** → `OwnerLoginPromptView` (`signIn` client component)
- **claimed + 게스트 + 비소유자 기기** → `PrivatePageView`
- 소유자 로그인 + 기기 미등록 → `registerDevice` + 응답 `Set-Cookie` (대체 경로)
- `generateMetadata`: claimed 시 `title: "개인 묵상기록지"`

### T4. claim API — 기기 토큰 발급 + GET 폐기
**파일:** `src/app/api/seats/claim/route.ts`

- POST 성공 응답에 `Set-Cookie: eobom_device_token=<token>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`
- GET 메서드 → `405` (page의 자동 redirect 경로 제거와 세트)

### T5. 로그인 유도 뷰 (client)
**파일:** `src/components/` (신규, 예: `owner-login-prompt.tsx`)

- `signIn("google", { callbackUrl: `/j/${slug}` })` 호출 버튼
- `LoginButton`은 claimSlug 없이 일반 로그인용으로만 사용

### T6. UI 뷰 3종
**파일:** `src/app/j/[slug]/page.tsx` 내 함수 또는 `src/components/`

- `ClaimPromptView`: "이 키링을 내 기록으로 연결할까요?" + POST claim 버튼
- `OwnerLoginPromptView`: "내 기록으로 돌아가기" + Google 로그인
- `PrivatePageView`: "이 주소는 개인 기록 공간입니다" (로그인 버튼·소유자 정보 없음)

### T7. 테스트
**파일:** `src/lib/__tests__/seats.test.ts`(확장), API 테스트

- unit: `generateDeviceToken` 형식, `isOwnerDevice` 4분기, `registerDevice` 5개 초과 revoke
- API: POST claim 성공 → 쿠키 포함; GET → 405
- integration: `/j/[slug]` 5분기 HTML에 소유자명 미노출

---

## 4. 수용 기준

1. 로그인 사용자가 unclaimed `/j/eNN` 방문 → **claim되지 않고** 버튼만 보인다 (자동 redirect 코드 부재 확인)
2. claimed 키링을 비소유자 기기 게스트가 방문 → 로그인 버튼·소유자명·기록 미노출
3. claimed 키링을 소유자 기기 + 미로그인 방문 → 로그인 후 `/j/eNN` 복귀 → `OwnerView`
4. 첫 등록: 게스트 → Google 시작 → claim → 기기 토큰 쿠키 → `OwnerView`
5. `generateMetadata` title에 소유자 이름 없음
6. `tsc --noEmit` + 관련 테스트 통과

---

## 5. 구현 노트

- 쿠키는 `httpOnly` + `secure` 필수. 로컬 http 환경에서 secure 쿠키가 안 가면 `NODE_ENV` 분기(프로덕션만 secure) — 배포 환경(https) 기준으로 secure 유지.
- 기기 판별은 **서버 컴포넌트에서만** (클라이언트 JS 의존 금지).
- claim 트랜잭션은 기존 `claimSeat` 재사용, 기기 등록은 별도 호출.
- OAuth 콜백 경로를 수정하지 않는 대체 경로 우선: `/j/[slug]` 서버 컴포넌트에서 소유자 로그인 + 기기 미등록 시 `registerDevice` + `Set-Cookie`로 응답. `auth.ts`의 `applyClaimIfNeeded`는 기존 동작 유지.
- `LoginButton`의 claimSlug 경로는 **게스트→첫 등록**에만 사용 (T5와 역할 분리).
- 기존 테스트(`tests/seats.test.ts` 존재 시)와 충돌하지 않도록 유틸 시그니처 보존.

---

## 6. DoD 체크

- [ ] 설계 문서 존재 (`docs/design/keyring-access-control-v1.md`)
- [ ] 본 WO 존재
- [ ] `UserDevice` 마이그레이션 적용 (로컬 push + 배포 계획)
- [ ] 자동 claim 코드 제거 확인
- [ ] 5분기 접근 분기 동작 (unit/integration 테스트로 증명)
- [ ] 기기 토큰 쿠키 발급·검증
- [ ] metadata 소유자명 제거
- [ ] tsc clean
- [ ] 배포 후 수동 시나리오 5종 검증
