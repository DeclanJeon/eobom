# 신뢰 경계 · 홈 성능 (Trust Boundaries) v1 설계

- 문서 버전: **v1.0**
- 작성일: 2026-07-28
- 상태: **구현 전 설계 확정안**
- 근거: 전체 검토 Sprint A–B (동의 서버 강제 · rate limit · together 안전 · today 쿼리 · README)
- 후속 실행: `docs/work-orders/WO-2026-07-28-trust-boundaries.md`
- 관련: `docs/meditation_journal_prd_v1.0.md`, `docs/brand-message.md`, User 설정 플래그

---

## 0. 한 줄 요약

설정 UI에만 있던 **AI/함께/과거의 오늘 동의**를 서버에서 강제하고,  
고비용·쓰기 API에 **프로세스 내 rate limit**을 두며,  
함께 게시 safety 실패 시 **DB에 남기지 않고**,  
`/today` 쿼리를 **합치고 pastToday를 연도 범위 조회로** 줄인다.

---

## 1. 문제

| ID | 현상 | 위험 |
|----|------|------|
| T1 | `aiProcessingConsent` off여도 `POST /api/reviews`·태그 생성 가능 | 외부 모델 전송·약관/신뢰 위반 |
| T2 | `communityEnabled` off여도 `POST /api/together` 가능 | 사용자가 끈 나눔이 동작 |
| T3 | `pastTodayEnabled` off여도 `/today`에 과거 카드 | 설정 무력화 |
| T4 | reviews/together/tags/uploads/contact에 호출 한도 없음 | 비용·스팸 |
| T5 | together safety block 시 private row 생성 후 400 | 고아·민감 사본 잔존 |
| T6 | `/today` entry 조회 4회 + pastToday 400건 메모리 필터 | 지연·DB 부하 |
| T7 | README에 다시 머물 본문 미기재 | 제품 약속 불일치 |

비목표 (이 문서 범위 밖):
- 전 API zod 일괄 도입
- shadcn/deps 다이어트
- Redis 분산 rate limit
- PrayerTopic 제품화
- 작성 폼 성구 opt-in 추천

---

## 2. 원칙

| ID | 원칙 |
|----|------|
| P1 | **설정 토글 = 서버 진실.** UI 숨김만으로 부족. |
| P2 | 동의 판정은 **DB 현재 값** 기준 (세션 캐시는 UX 힌트용). |
| P3 | Rate limit 실패는 **429** + 한국어 안내, 부분 성공 없음. |
| P4 | Safety 실패 시 **쓰지 않음** (create 후 private 보관 금지). |
| P5 | `/today`는 추가 AI 호출 없음 (기존 reread 설계 유지). |
| P6 | 단일 프로세스 배포(systemd) 전제 in-memory limit 허용; 문서화. |
| P7 | 카피: 비난·점수 없이 “설정에서 허용” 톤. |

---

## 3. 동의 강제 매트릭스

| 플래그 | 기본 | 강제 위치 | HTTP | 사용자 메시지 (고정) |
|--------|------|-----------|------|----------------------|
| `aiProcessingConsent` | `false` | `POST /api/reviews` **MiMo 호출 전** | 403 | `AI 회고를 쓰려면 설정에서 기록 외부 처리 허용이 필요합니다.` |
| `aiProcessingConsent` | | `POST /api/together/tags` (외부 태그 생성) | 403 | 동일 또는 `AI 주제 태그를 쓰려면…` |
| `communityEnabled` | `false` | `POST /api/together` | 403 | `함께 나눔을 쓰려면 설정에서 익명 피드 참여를 켜 주세요.` |
| `pastTodayEnabled` | `true` | `/today` 렌더 | — | 섹션 미렌더 (쿼리도 스킵) |

### 3.1 판정 헬퍼

`src/lib/user-preferences.ts` (신규):

```ts
export type UserPreferenceFlags = {
  aiProcessingConsent: boolean;
  communityEnabled: boolean;
  pastTodayEnabled: boolean;
};

export async function getUserPreferenceFlags(userId: string): Promise<UserPreferenceFlags>;
// db.user.findUnique select 3 flags; missing user → all false except pastToday default true only if row exists with default
```

API에서 session.id로 이 함수 호출. **세션 필드만 믿지 않음.**

선택: `auth` session callback에 `communityEnabled`/`pastTodayEnabled` 추가 — 페이지 힌트용. 강제 경로는 항상 DB.

### 3.2 UI 연동

- `/reviews/new`: consent false면 생성 폼 대신 설정 링크 + 설명 (서버 리다이렉트 또는 인페이지 가드).
- `/reviews` 목록: 기존 설정 CTA 유지.
- together composer: community off면 게시 버튼 비활성 + 설정 링크 (가능하면; API 403이 최종 방어).
- API 403 body: `{ error: string, code: "CONSENT_AI" | "CONSENT_COMMUNITY" }`.

### 3.3 together/tags와 AI 동의

태그 생성은 외부 모델 가능 → **aiProcessingConsent 필요**.  
consent 없으면: 403 **또는** 클라이언트 태그만 허용하고 서버 생성 스킵.  
v1 결정: **tags POST는 consent 필수 403** (단순·일관).  
together POST 본문에 이미 tags가 있으면 AI 없이 저장 가능하나, empty tags 시 generate 호출 전 consent 검사.

---

## 4. Rate limit

### 4.1 모듈

`src/lib/rate-limit.ts`:

```ts
export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

export function checkRateLimit(key: string, opts: {
  limit: number;
  windowMs: number;
  now?: number;
}): RateLimitResult;
```

- 구현: 프로세스 메모리 `Map<string, number[]>` 타임스탬프 큐 (sliding window).
- 키: `${bucket}:${userId}` 또는 비로그인 contact는 `${bucket}:ip:${ip}`.
- 테스트 가능: `now` 주입, `resetRateLimitForTests()`.

### 4.2 한도 (v1)

| Bucket | 한도 | 윈도우 | 적용 |
|--------|------|--------|------|
| `reviews:create` | 5 | 1시간 | POST reviews |
| `together:create` | 20 | 1시간 | POST together |
| `together:tags` | 30 | 1시간 | POST together/tags |
| `uploads` | 40 | 1시간 | POST uploads |
| `contact` | 10 | 1시간 | POST contact (userId or IP) |

초과 시:
```json
{ "error": "요청이 잠시 많았습니다. 잠시 후 다시 시도해 주세요.", "code": "RATE_LIMITED", "retryAfterSec": N }
```
상태 **429**, 헤더 `Retry-After: N` 권장.

### 4.3 한계 (문서화)

단일 인스턴스 전제. 멀티 인스턴스 시 공유 스토어 필요 — README/설계에 명시.

---

## 5. Together safety 쓰기 정책

**Before (현재):** scan → create(private if blocked) → 400 + id  
**After:** scan → if blocked **return 400 without create** → else create public

```ts
const safety = scanSafety(publicBody);
if (safety.blocked) {
  return NextResponse.json({ error: "...", safety, code: "SAFETY_BLOCKED" }, { status: 400 });
}
// create only when public-safe
```

기존 private orphan은 마이그레이션 필수 아님 (운영 정리 선택).

---

## 6. `/today` 쿼리 설계

### 6.1 목표 쿼리 수

| 데이터 | 전략 |
|--------|------|
| recent + fallback 후보 | **1회** `findMany` take 40, order entryDate desc, 필요 select |
| openActions | 기존 1회 |
| latestReview | 기존 1회 |
| allowedRefs | included ids 있을 때만 1회 (또는 included entries를 review 생성 시 캐시 — v1은 기존 유지) |
| pastToday | `pastTodayEnabled`일 때만 **1회** 연도 OR 범위 |

최대 병렬: actions + review + entries40 + (optional pastToday) + (optional allowedRefs).

### 6.2 pastToday 조회

```ts
function pastTodayDateRanges(now: Date, yearsBack = 8): Array<{ gte: Date; lte: Date }> {
  // each prior year, same month/day local calendar
}
// findMany where userId, deletedAt null, OR entryDate in ranges, order desc, take 1
```

타임존: 사용자 `timezone` 이상적이지만 v1은 **서버 로컬/Date** 기존 동작과 동일하게 `now`의 getMonth/getDate 사용 (회귀 최소화). 후속: Asia/Seoul 명시.

### 6.3 플래그

```ts
const flags = await getUserPreferenceFlags(user.id);
// pastToday only if flags.pastTodayEnabled
// home reread unchanged
```

### 6.4 추출 (테스트 용이)

`src/lib/today-data.ts` 선택:
- `buildPastTodayWhere(now, yearsBack)`
- 또는 past ranges pure function만 lib에 두고 페이지에서 쿼리.

v1 최소: `src/lib/past-today.ts`에 ranges + pick helper.

---

## 7. README

주요 기능에 한 줄:

```markdown
- **다시 머물 본문** — 회고·오늘 홈에서 기록에 등장한 말씀을 처방 없이 다시 연결
```

AI 회고 bullet에 “설정 동의 필요” 짧게 가능.

---

## 8. 에러 코드 계약

| code | status | 의미 |
|------|--------|------|
| `CONSENT_AI` | 403 | AI 처리 동의 없음 |
| `CONSENT_COMMUNITY` | 403 | 함께 참여 꺼짐 |
| `RATE_LIMITED` | 429 | 한도 초과 |
| `SAFETY_BLOCKED` | 400 | 함께 본문 안전 검사 실패 (미저장) |

클라이언트가 code로 설정 페이지 유도 가능.

---

## 9. 테스트 계획

| 파일 | 내용 |
|------|------|
| `tests/rate-limit.test.ts` | window, limit, reset, remaining |
| `tests/user-preferences.test.ts` | mock 없이 pure 메시지 상수; flags loader는 db 없으면 skip 또는 mock |
| `tests/past-today.test.ts` | ranges 경계 (윤년·월말) |
| `tests/together-safety-policy` | pure: blocked ⇒ shouldPersist false |
| reviews/together: 가능하면 handler 단위 대신 **policy 함수** 단위 |

DB 통합은 seats처럼 환경 의존 → v1은 pure + 기존 bun test 스위트에 합류.

Consent 메시지·code 상수 export 후 assert.

---

## 10. 롤아웃 · 롤백

- 플래그 기본값 변경 없음 (`ai`/`community` false, `pastToday` true).
- 동의 강제 후 기존 미동의 유저는 회고 생성 403 — 설정 CTA로 유도 (의도된 동작).
- Rate limit 맵은 재시작 시 초기화.
- 롤백: 각 가드를 feature 상수 `ENFORCE_CONSENT = true`로 묶지 않고 코드 제거로 롤백 (단순).

---

## 11. DoD

1. consent false → reviews POST 403 + MiMo 미호출 (단위/스파이 또는 코드 경로 검사).  
2. community false → together POST 403.  
3. pastToday false → today에 과거 섹션 없음·전용 쿼리 없음.  
4. rate limit 초과 → 429 + code.  
5. safety block → DB create 없음.  
6. today entry 풀스캔 400 제거, pastToday ranges 사용.  
7. README 기능 목록 갱신.  
8. 신규 단위 테스트 통과; 기존 non-DB 스위트 green.

---

## 12. 결정 로그

| 결정 | 선택 | 이유 |
|------|------|------|
| 동의 소스 | DB 재조회 | 세션 stale 방지 |
| tags AI | consent 필수 | 외부 전송 일관 |
| rate store | memory | 단일 인스턴스 배포 |
| safety | no insert | 잔존 데이터 방지 |
| pastToday | year OR ranges | 400 scan 제거 |
