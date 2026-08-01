# 키링 URL 접근제어 + 기기등록 설계

| | |
|---|---|
| 문서 버전 | v1 |
| 작성일 | 2026-08-01 |
| 상태 | 초안 (작업지시서: [WO-2026-08-01-keyring-access-control](../work-orders/WO-2026-08-01-keyring-access-control.md)) |
| 관련 파일 | `src/lib/seats.ts`, `src/app/j/[slug]/page.tsx`, `src/lib/auth.ts`, `src/components/login-button.tsx`, `src/app/api/seats/claim/route.ts`, `src/app/api/seats/claim-intent/route.ts`, `prisma/schema.prisma` |

## 0. 한 줄 요약

키링 URL(`/j/e01`~`e10000`)은 **소유자만 접근 가능한 개인 페이지**로 만든다. 소유자-기기 바인딩(기기등록)을 도입해 링크 진입 즉시 "본인인지 아닌지"를 판별하고, 미로그인 소유자는 로그인만 유도하며, **자동 claim(선점)을 제거**해 순차 번호 추측 공격을 차단한다.

## 1. 문제

### 1.1 현재 동작

`src/app/j/[slug]/page.tsx`의 접근 분기는 아래와 같이 동작한다.

| 상태 | 방문자 | 현재 동작 |
|---|---|---|
| unclaimed | 게스트 | "나의 묵상기록지" + Google 시작 (첫 등록) |
| unclaimed | **로그인 사용자** | **자동 redirect → `/api/seats/claim` → 즉시 claim (선점)** |
| claimed | 소유자(로그인) | `OwnerView` (최근 기록 5건 표시) |
| claimed | 타인(로그인) | "다른 사람의 키링입니다" 차단 |
| claimed | 게스트 | "Google로 이어서 로그인하면 내 기록으로 들어갑니다" + 로그인 버튼 |
| revoked | 모두 | "사용할 수 없는 키링" + 문의 링크 |

### 1.2 결함

1. **자동 claim → 키링 선점 공격 (CRITICAL)**
   - 키링 슬러그는 `e01`~`e10000` 순차 번호라 추측이 자명하다.
   - 로그인한 아무 사용자나 `/j/e05`를 방문하면 즉시 그 키링을 선점한다.
   - 물리 키링을 가진 실제 소유자가 나중에 QR을 찍어도 "이미 다른 사용자가 사용 중"이 되어 등록 불가.
   - `login-button.tsx`의 `claim-intent` 쿠키 + OAuth 콜백 claim은 의도된 정식 흐름이지만, **page의 자동 redirect가 이 정식 흐름을 우회**한다.

2. **claimed 키링에서 타인에게 정보 노출 (HIGH)**
   - claimed 키링에 **게스트(비소유자)가 로그인 버튼을 본다**: "Google로 이어서 로그인하면 내 기록으로 들어갑니다" — 소유자가 아닌 방문자에게 "이 키링은 등록된 사용자가 있다"는 사실과 로그인 유도가 노출된다.
   - `generateMetadata`가 claimed 상태에서 **소유자 이름을 `<title>`에 노출**한다 (개인정보).

3. **기기등록 부재 (HIGH)**
   - "링크 진입 즉시 본인인지 판별"할 수단이 없다.
   - 미로그인 소유자와 무관한 게스트가 **동일한 화면**(로그인 버튼)을 보므로, 소유자 우대 경험이 불가능하다.
   - 스키마에 device 관련 모델이 전혀 없다 (확인 완료: `schema.prisma`에서 `device|Device|keyring` 0건).

4. **미로그인 소유자 플로우 부재 (MEDIUM)**
   - 소유자가 로그아웃된 브라우저에서 QR을 찍으면 "다른 사람의 키링입니다" 또는 "Google로 이어서" 화면만 보인다.
   - "본인 기기임을 확인한 뒤 로그인만 시키면 바로 내 기록"이라는 흐름이 없다.

### 1.3 기존에 이미 갖추어진 것 (유지)

- claimed 키링 + 타인 로그인 → 차단 ("다른 사람의 키링입니다") — 이미 구현됨.
- claimed + 소유자 로그인 → `OwnerView` — 이미 구현됨.
- revoked → 차단 + 문의 링크 — 이미 구현됨.
- claim 정식 흐름(claim-intent 쿠키 → OAuth → `applyClaimIfNeeded`) — 이미 구현됨.
- `seats.ts`의 `isKeyringSlug`, `parseNumberedSlug`, `formatNumberedSlug`, `claimSeat` 트랜잭션 — 견고함.

## 2. 목표 / 비목표

### 목표 (In Scope)

- [G1] claimed 키링은 **소유자 이외 누구도 내용을 볼 수 없다** (게스트/타인: "개인 페이지" 안내만, 로그인 버튼·소유자명·기록 노출 금지).
- [G2] **기기등록** 도입: claim 성공 시 소유자 브라우저에 기기 토큰을 발급·저장하고, `/j/[slug]` 진입 시 토큰으로 소유자 기기 여부를 판별한다.
- [G3] **미로그인 소유자**가 자신의 기기로 접근하면 "본인 확인 → 로그인 → 내 기록" 단일 흐름을 제공한다.
- [G4] **첫 등록자**는 QR/링크 → "Google로 시작하기" → claim → 기기등록 완료 흐름을 명확히 안내받는다.
- [G5] **자동 claim 제거**: unclaimed 키링에 로그인 사용자가 접근해도 즉시 claim하지 않고, 명시적 동의("이 키링을 내 기록으로 연결하기")를 요구한다.
- [G6] 메타데이터에서 소유자 이름·이메일 노출 제거.

### 비목표 (Out of Scope)

- NFC 하드웨어 연동, 물리 키링 발급/배송 워크플로.
- 소유자의 키링 양도(transfer) 또는 해지 UI (다음 스프린트 후보).
- 다중 키링 소유 (현재 `@@unique([userId])` 1인 1키링 유지).
- PWA/모바일 앱 설치 단계의 기기등록 강화 (웹 쿠키 기반으로 충분).

## 3. 원칙

| 원칙 | 내용 |
|---|---|
| 최소 노출 | 비소유자에게는 키링 존재 여부와 claimed 상태 외 어떤 정보도 노출하지 않는다. |
| 기본 거부 | 소유자/소유자 기기/본인 세션 중 하나라도 확인되지 않으면 내용을 렌더링하지 않는다. |
| 자동 부여 금지 | claim은 반드시 사용자의 명시적 행위(QR 진입 + 로그인, 또는 버튼 클릭)를 거쳐야 한다. |
| 서버 판정 | 기기 판별은 서버 컴포넌트에서 수행 (클라이언트 JS 의존 금지). |
| 재사용 | `seats.ts`의 슬러그 파서·claim 트랜잭션·에러 코드를 그대로 확장한다. |

## 4. 상세 설계

### 4.1 데이터 모델 (Prisma)

`prisma/schema.prisma`에 `UserDevice` 모델 추가:

```prisma
model UserDevice {
  id          String    @id @default(cuid())
  userId      String
  tokenHash   String    @unique   // SHA-256(deviceToken) — 평문 저장 금지
  label       String?   // "Chrome on MacBook" 등
  lastSeenAt  DateTime?
  createdAt   DateTime  @default(now())
  revokedAt   DateTime?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- **토큰**: `crypto.randomBytes(32).toString("base64url")` (43자).
- **저장**: DB에는 `SHA-256` 해시만. 토큰 평문은 쿠키에만 존재.
- **쿠키**: `eobom_device_token` — `httpOnly`, `secure`, `sameSite: "lax"`, `maxAge: 365일`, path `/`.
- **여러 기기**: 같은 사용자라도 기기별로 여러 `UserDevice` 행 허용 (사용자당 최대 5개 제한, 초과 시 가장 오래된 것 revoke).
- **기기 해제**: `/me` 설정 UI에서 목록 조회·해제 (비목표이지만 스키마에 `revokedAt`만 두고 UI는 다음 스프린트).

### 4.2 접근 결정 매트릭스 (핵심)

`/j/[slug]` 접근 시 서버에서 판정:

| seat 상태 | 방문자 | 기기 판별 | 동작 |
|---|---|---|---|
| unclaimed | 게스트 | — | 첫 등록 안내 + "Google로 시작하기" (현행 유지) |
| unclaimed | 로그인 사용자 | — | **"이 키링을 내 기록으로 연결하기" 명시적 버튼** (자동 claim 금지) |
| claimed | 소유자(로그인) | — | `OwnerView` (현행 유지) |
| claimed | 타인(로그인) | — | "다른 사람의 키링입니다" 차단 (현행 유지) |
| claimed | 게스트 | **소유자 기기** | "내 기록으로 들어가기" 로그인 버튼 (`callbackUrl=/j/slug`) |
| claimed | 게스트 | 비소유자 기기 | "이 주소는 개인 기록 공간입니다" (로그인 버튼·소유자 정보 노출 금지) |
| revoked | 모두 | — | "사용할 수 없는 키링" (현행 유지) |

핵심 규칙 3가지:

1. **unclaimed + 로그인 사용자 = 자동 claim 금지.** 대신 `OwnerView` 대신 명시적 버튼을 렌더링하고, 클릭 시 `POST /api/seats/claim` (기존 엔드포인트) → 성공 시 기기 토큰 발급 + `/j/slug` 리다이렉트.
2. **claimed + 게스트 + 소유자 기기 = 로그인 유도.** 기기 토큰으로 "이 브라우저는 소유자의 기기"임을 서버가 확인했으므로, 로그인만 시키면 된다. `signIn("google", { callbackUrl: `/j/${slug}` })`.
3. **claimed + 게스트 + 비소유자 기기 = 무정보 차단.** 로그인 버튼 자체를 렌더링하지 않는다 (G1).

### 4.3 서버 구현 위치

#### 4.3.1 `src/lib/seats.ts` 확장

```ts
// 새 유틸
generateDeviceToken(): { token: string; tokenHash: string }
getDeviceTokenHash(req: Request): string | null      // 쿠키에서 해시만 추출
isOwnerDevice(userId: string, tokenHash: string | null): Promise<boolean>
registerDevice(userId: string, token: string, label?: string): Promise<UserDevice>
```

- `claimSeat`는 **기존 시그니처 유지**, 성공 후 `registerDevice`를 별도 호출 (claim과 기기등록을 하나의 트랜잭션으로 묶지 않음 — 기기등록 실패가 claim을 롤백하면 안 됨).

#### 4.3.2 `src/lib/auth.ts`

- `applyClaimIfNeeded()`: claim 성공 분기에서 **기기 토큰 발급 + 쿠키 set-cookie 헤더를 리다이렉트 응답에 실어** 콜백이 `/j/slug`로 돌아갈 때 기기 등록이 완료된 상태로 만든다.
  - OAuth 콜백이 서버 액션/라우트 핸들러 경유이므로, `NextResponse.redirect(url, { headers: { "Set-Cookie": ... } })`로 쿠키를 실어 보낸다. (`signIn` 콜백에서 직접 쿠키를 못 넣는 경우, `applyClaimIfNeeded`에서 claim된 slug를 세션/쿠키에 기록하고 `/j/slug` 페이지에서 서버 컴포넌트가 기기 토큰 미등록 시 자동 발급하는 대체 경로 사용.)
  - **대체 경로(권장, 단순)**: `/j/[slug]` 서버 컴포넌트에서 "소유자 로그인 + 기기 미등록"이면 `registerDevice` 후 `Set-Cookie`를 페이지 응답에 실어 렌더링. OAuth 콜백 경로를 건드릴 필요 없음.

#### 4.3.3 `src/app/j/[slug]/page.tsx`

접근 분기 재작성:

```ts
const seat = await getSeatBySlug(slug);            // 기존
const viewer = await getOptionalUser();            // 기존
const deviceHash = getDeviceTokenHash(cookies());  // 신규

// 분기
if (seat.status === "revoked") → 기존 revoked 뷰
if (seat.status === "unclaimed") {
  if (viewer) → ClaimPromptView(명시적 버튼)   // 기존 자동 redirect 제거
  else       → FirstRegisterView(기존 유지)
}
if (seat.status === "claimed") {
  if (viewer?.id === seat.claimedUserId) {
    → OwnerView + (기기 미등록이면 registerDevice + Set-Cookie)
  }
  if (viewer && viewer.id !== seat.claimedUserId) → BlockedView(기존 유지)
  // 게스트
  const isOwnerDevice = await isOwnerDevice(seat.claimedUserId, deviceHash);
  if (isOwnerDevice) → OwnerLoginPromptView(로그인 유도, callbackUrl=/j/slug)
  else               → PrivatePageView(무정보 차단)
}
```

- `generateMetadata`: claimed 상태면 `title: "개인 묵상기록지"`로 고정 (소유자명 노출 제거). unclaimed는 "나의 묵상기록지".

#### 4.3.4 `src/app/api/seats/claim/route.ts`

- `POST` claim 성공 시 응답에 `Set-Cookie: eobom_device_token=...` 포함 (기기 등록). GET 호출(`page` 자동 redirect)은 **제거** — 이 라우트는 POST 전용으로 고정하고, page의 자동 redirect 코드 삭제가 선행 조건.

### 4.4 UI 설계

#### 4.4.1 `ClaimPromptView` (unclaimed + 로그인 사용자)

- 제목: "이 키링을 내 기록으로 연결할까요?"
- 본문: "이 키링은 아직 등록되지 않았습니다. 연결하면 이 키링은 내 개인 기록 공간이 되며, 다른 사용자는 접근할 수 없습니다."
- 버튼: `이 키링을 내 기록으로 연결하기` (POST `/api/seats/claim`)
- 부가: "다른 키링으로 이동" 링크
- **확정/취소 구분 없이 버튼 1개** — 클릭 자체가 명시적 동의이므로 충분.

#### 4.4.2 `OwnerLoginPromptView` (claimed + 게스트 + 소유자 기기)

- 제목: "내 기록으로 돌아가기"
- 본문: "이 브라우저는 이 키링의 소유자 기기로 등록되어 있습니다. 로그인하면 바로 내 기록을 볼 수 있습니다."
- 버튼: `Google로 로그인` → `signIn("google", { callbackUrl: "/j/<slug>" })`
- 로그인 후 → `OwnerView` 직행.

#### 4.4.3 `PrivatePageView` (claimed + 게스트 + 비소유자 기기)

- 제목: "이 주소는 개인 기록 공간입니다"
- 본문: "이 키링은 등록된 사용자만 접근할 수 있습니다."
- **로그인 버튼·소유자 정보·기록 미리보기 전혀 없음.**
- 문의 링크(`mailto` 또는 기존 문의 채널)만 제공.

#### 4.4.4 `OwnerView` (기존 + 기기 상태 배지)

- 기존 최근 기록 5건 유지.
- 상단에 "내 기록" + (신규) "기기등록됨" 상태 배지.
- (선택) `/me`에서 기기 목록 관리 링크 — 비목표이므로 링크만 두고 페이지는 다음 스프린트.

### 4.5 오류·경계 처리

| 케이스 | 처리 |
|---|---|
| 쿠키 토큰 해시가 DB와 불일치 | 비소유자 기기로 판정 → `PrivatePageView` |
| 기기 등록 5개 초과 | 가장 오래된 활성 기기 revoke 후 신규 등록 |
| claim 중 `already_claimed` | 409 + "이미 다른 사용자가 사용 중인 키링입니다" (기존 에러 코드 재사용) |
| claim 중 `user_has_other_seat` | 409 + "이미 내 기록으로 연결된 키링이 있습니다" |
| revoked 키링 + 소유자 로그인 | revoked 뷰 (기존 유지) |
| `/j/not-a-slug` | 404 (기존 `isKeyringSlug` 경로 유지) |

### 4.6 테스트 계획

- **unit** (`src/lib/__tests__/seats.test.ts` 확장):
  - `generateDeviceToken` → 토큰/해시 형식, 해시는 재현 불가.
  - `isOwnerDevice` → 등록/미등록/revoke/토큰 불일치 분기.
- **API** (`claim`):
  - POST claim 성공 → 기기 토큰 쿠키 포함.
  - GET claim → 405 (자동 claim 경로 폐기 확인).
- **e2e / integration** (`/j/[slug]`):
  - unclaimed + 로그인 → **자동 claim 안 됨**, 버튼 렌더링.
  - claimed + 소유자 → OwnerView.
  - claimed + 타인 → 차단.
  - claimed + 게스트 + 소유자 기기 쿠키 → 로그인 유도 화면.
  - claimed + 게스트 + 비소유자 기기 → 무정보 차단 (title, body에 소유자명 없음).
  - revoked → 차단.

## 5. 작업 분해 (요약)

전체 작업지시서는 [WO-2026-08-01-keyring-access-control](../work-orders/WO-2026-08-01-keyring-access-control.md) 참조.

| # | 작업 | 영향 파일 |
|---|---|---|
| T1 | `UserDevice` 모델 + 마이그레이션 | `prisma/schema.prisma`, DB push |
| T2 | 기기 토큰 유틸 (`seats.ts` 확장) | `src/lib/seats.ts` |
| T3 | page.tsx 접근 분기 재작성 (자동 claim 제거, 4분기) | `src/app/j/[slug]/page.tsx` |
| T4 | claim POST 성공 시 기기 토큰 발급 | `src/app/api/seats/claim/route.ts` |
| T5 | OAuth 콜백→기기등록 (대체 경로: page 서버 컴포넌트에서 등록) | `src/lib/auth.ts`(없으면 page에서 처리) |
| T6 | UI 3뷰 (ClaimPrompt / OwnerLoginPrompt / PrivatePage) | `src/app/j/[slug]/page.tsx`, `src/components/` |
| T7 | metadata 소유자명 제거 | `src/app/j/[slug]/page.tsx` |
| T8 | 테스트 작성 | `src/lib/__tests__/`, API 테스트 |

## 6. 정의된 완료 (DoD)

- [ ] unclaimed 키링을 로그인 사용자가 방문해도 **claim되지 않는다** (자동 redirect 코드 제거 확인).
- [ ] claimed 키링을 비소유자 기기의 게스트가 방문하면 **로그인 버튼·소유자명·기록이 렌더링되지 않는다** (HTML에 노출 없음).
- [ ] claimed 키링을 소유자 기기 + 미로그인으로 방문하면 로그인 후 `/j/slug`로 돌아와 `OwnerView`가 보인다.
- [ ] 첫 등록: 게스트 → Google 시작 → claim → 기기 토큰 쿠키 발급 → OwnerView 직행.
- [ ] `generateMetadata`의 title에 소유자 이름이 없다.
- [ ] `npx tsc --noEmit` 통과, 관련 테스트 통과.
- [ ] 배포 후 수동 시나리오(소유자/타인/미로그인/첫 등록) 검증.

## 7. 미결정 사항

1. 기기 토큰 쿠키의 `sameSite` — `lax` (OAuth redirect 후에도 유지되도록).
2. 기기 목록 관리 UI — 스키마·API만 준비하고 UI는 다음 스프린트로 분리 (비목표).
3. 소유자가 기기를 잃어버린 경우 — 기기 재등록 경로 (문의 채널 안내로 v1 보류).
