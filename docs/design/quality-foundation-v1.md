# 품질 기반 (Quality Foundation) v1 설계

- 문서 버전: **v1.0**
- 작성일: 2026-07-28
- 상태: **구현 전 설계 확정안**
- 근거: 전체 검토 Sprint C–D (API 견고성 · 테스트 기반 · scrub 공유 · 죽은 코드/deps)
- 후속 실행: `docs/work-orders/WO-2026-07-28-quality-foundation.md`
- 관련: `docs/design/trust-boundaries-v1.md`, `src/lib/session.ts`, `src/lib/mimo.ts`, `src/lib/reread-scriptures.ts`

---

## 0. 한 줄 요약

API 세션 가드와 입력 검증을 **공통 헬퍼로 모으고**, 금지 문구 scrub을 **단일 모듈**로 합치며,  
테스트 스크립트·seats 분리를 정리하고, **미사용 UI/deps/store**를 제거한다.

---

## 1. 문제

| ID | 현상 | 위험 |
|----|------|------|
| Q1 | 21개 API route가 `getServerSession` 복붙 | 누락·불일치 |
| Q2 | zod 의존성 있으나 API 입력 검증 0 | 잘못된 body·타입 구멍 |
| Q3 | `mimo` / `reread-scriptures` 금지 패턴 이중 | 드리프트 |
| Q4 | `bun test tests`가 seats DB에 의존 | CI/로컬 불안정 |
| Q5 | tsc가 `bun:test` 미해석 | 타입체크 노이즈 |
| Q6 | `components/ui` ~48 중 앱 사용 3 + 미사용 heavy deps | 유지비·설치 비용 |
| Q7 | `auth-store`(zustand) 참조 0 | 죽은 코드 |

비목표:
- Redis rate limit, PrayerTopic 제품화, reread 작성 폼 opt-in
- 전 radix 패키지 전수 삭제(사용하는 sheet/toast 체인 유지)
- 브라우저 e2e 풀 스위트

---

## 2. 원칙

| ID | 원칙 |
|----|------|
| P1 | 페이지는 `requireUser`(redirect), API는 `requireApiUser`(401 JSON). |
| P2 | 쓰기/민감 POST·PATCH body는 zod; GET 쿼리도 단순 스키마 권장. |
| P3 | 검증 실패는 **400** + `{ error: string, code?: "VALIDATION" }`. |
| P4 | scrub 패턴 한 곳; mimo·reread가 import. |
| P5 | `test:unit`은 DB 없이 green; seats DB 테스트는 분리·스킵 가능. |
| P6 | 미사용 삭제는 **정적 import 근거**; 사용 중 sheet/toast/toaster 유지. |
| P7 | 동작 회귀 없이 리팩터 — 카피·status code 유지(trust-boundaries 포함). |

---

## 3. API 세션 헬퍼

### 3.1 `src/lib/session.ts` 확장

```ts
export type ApiUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  // existing session.user fields used by callers
};

export async function requireApiUser(): Promise<
  { ok: true; user: ApiUser } | { ok: false; response: NextResponse }
>;
```

- `ok: false` → `NextResponse.json({ error: "Unauthorized" }, { status: 401 })`
- 기존 `requireUser` / `getOptionalUser` 유지

### 3.2 적용 범위 (v1)

모든 `src/app/api/**/route.ts` 중 `getServerSession` 직접 호출하는 핸들러를 `requireApiUser`로 교체.  
예외: 의도적 비로그인 허용 구간
- `POST /api/contact` — 세션 optional 유지, rate key만 user/ip
- `GET /api/together` — 공개
- bible GET 등 공개

`POST /api/seats/claim` GET 로그인 리다이렉트 분기는 기존 유지하되 session 획득은 헬퍼화 가능.

---

## 4. Zod 스키마

### 4.1 위치

`src/lib/api-schemas.ts` — route별 export.

### 4.2 공통 유틸

```ts
export function parseJsonBody<T>(schema: ZodType<T>, data: unknown):
  | { ok: true; data: T }
  | { ok: false; response: NextResponse };
// 400 { error: first issue message (ko where we set), code: "VALIDATION" }
```

`request.json()` try/catch → 400 invalid JSON.

### 4.3 v1 스키마 대상 (우선)

| Route | Schema |
|-------|--------|
| POST/PUT entries | reflectionBody min1; title/scripture optional constraints aligned with `validateEntryInput` |
| POST reviews | reportType enum; dates optional ISO; excludedEntryIds string[] |
| POST together | publicBody min20; scriptureRefs max5; tags; pseudonym; sourceEntryId |
| POST together/tags | publicBody min12; scriptureRefs |
| PATCH me | displayName, consents booleans, timezone, etc. existing fields |
| POST contact | name email subject message |
| PATCH actions/[id] | status enum; reflectionOnResult |
| POST together react | reactionType enum |

Entries: zod 통과 후 기존 `validateEntryInput` 재사용 가능(이중 방어 OK).

### 4.4 Zod 4

프로젝트 `zod@^4` — `z.object` / `z.string` 등 v4 API 사용. 테스트로 parse 검증.

---

## 5. Scrub 공유

### 5.1 `src/lib/content-scrub.ts`

```ts
export const FORBIDDEN_MIRROR_PATTERNS: RegExp[]; // base theological/judgment
export const FORBIDDEN_SCRIPTURE_EXTRA_PATTERNS: RegExp[]; // 추천 성구 등
export function scrubMirrorText(text: string, opts?: { includeScriptureExtras?: boolean }): string;
export function deepScrubMirror<T>(value: T, opts?): T;
```

- `mimo.ts`: base patterns + deepScrubMirror
- `reread-scriptures.ts`: base + scripture extras

단일 출처로 패턴 추가 시 한 파일만 수정.

---

## 6. 테스트 인프라

### 6.1 package.json scripts

```json
"test": "bun test tests",
"test:unit": "bun test tests --exclude tests/seats.test.ts",
"test:seats": "bun test tests/seats.test.ts"
```

(실제 bun exclude 문법은 구현 시 확인; 불가 시 `tests/unit` 디렉터리 이동 또는 seats 파일 상단 skip.)

### 6.2 seats

- **순수** slug 테스트: DB 불필요 — 유지
- **DB** 테스트: `beforeAll`에서 DATABASE_URL 파일 접근 실패 시 `describe.skip` 또는 임시 파일 db

권장:
```ts
const dbReady = await probeDb();
const d = dbReady ? describe : describe.skip;
```

### 6.3 tsconfig

`compilerOptions.types`에 `"bun-types"` 추가 **또는** tests를 exclude하고 `tsconfig.tests.json` 분리.  
v1: `types: ["bun-types"]` + 기존 next types 유지 확인.

---

## 7. 죽은 코드 · deps 다이어트

### 7.1 Keep UI

- `sheet.tsx`, `toast.tsx`, `toaster.tsx`
- `hooks/use-toast.ts`
- radix: `@radix-ui/react-dialog` (sheet), `@radix-ui/react-toast`
- `class-variance-authority`, `lucide-react` (사용 중이면 유지)

### 7.2 Delete

- `src/components/ui/*` except keep set
- `src/hooks/use-mobile.ts` (sidebar only)
- `src/stores/auth-store.ts` 전체 디렉터리 if empty
- package.json deps with **zero src import** (검증 후):
  - `@dnd-kit/*`, `recharts`, `embla-carousel-react`, `cmdk`, `vaul`, `input-otp`, `react-day-picker`
  - `@tanstack/react-table`, `@tanstack/react-query` (미사용 시)
  - 미사용 `@radix-ui/react-*` (accordion, menubar, …) — sheet/toast 제외 전수 제거 가능하나 **한 번에 크면** ui 파일 삭제 후 `bun install`로 orphan은 남길 수 있음. v1: **ui 파일 삭제 + 명백히 unused app-level deps**. radix 대량 제거는 optional second pass if build clean.

### 7.3 zustand

auth-store 삭제 후 zustand 미사용이면 dependencies에서 제거.

---

## 8. together composer (소)

`communityEnabled` false 시 게시 UI 비활성 + 설정 링크.  
세션에 플래그 없으면 클라이언트 `/api/me` 또는 서버 props.  
v1: share-form / together-composer에 optional `communityEnabled` prop from page.

---

## 9. 검증

```bash
bun run test:unit   # or equivalent
bun test tests/content-scrub.test.ts tests/api-schemas.test.ts
# build sanity
bun -e 'await import("./src/lib/session.ts")'
```

수동: entries POST invalid body 400; unauthorized 401.

---

## 10. DoD

1. 보호 API가 `requireApiUser` 사용 (공개·optional 제외).  
2. 우선 route body zod 검증 + VALIDATION 400.  
3. scrub 단일 모듈; mimo/reread 이중 패턴 제거.  
4. `test:unit` DB 없이 green; seats DB 없으면 skip.  
5. 미사용 ui/auth-store 삭제; 명백 unused deps 제거 후 lock 갱신.  
6. 기존 non-DB 스위트 회귀 없음.  
7. README 변경 없음(필수 아님).

---

## 11. 결정 로그

| 결정 | 선택 | 이유 |
|------|------|------|
| API user helper | session.ts 확장 | 기존 위치 |
| schemas | 단일 api-schemas.ts | 발견 용이 |
| seats | skip if no db | CI 안정 |
| deps diet | keep sheet/toast chain only | 안전 |
| composer community | prop from server | 단순 |
