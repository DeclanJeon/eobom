# 작업지시서: 신뢰 경계 · 홈 성능 v1

| 항목 | 내용 |
|------|------|
| ID | **WO-2026-07-28-trust-boundaries** |
| 작성일 | 2026-07-28 |
| 상태 | **Ready for implementation** |
| 설계 | `docs/design/trust-boundaries-v1.md` |
| 우선순위 | P0 동의·safety → P0 rate limit → P1 today → P1 README |

---

## 1. 목표

사용자 설정 동의를 서버에서 강제하고, 고비용 API를 제한하며, together 미저장 safety와 today 쿼리 효율·README를 맞춘다.

## 2. 범위

### In
- `getUserPreferenceFlags` + API/페이지 강제
- in-memory rate limit + 적용 라우트
- together safety: block 시 create 안 함
- today 쿼리 통합 + pastToday ranges + pastTodayEnabled
- README bullet
- 단위 테스트

### Out
- Redis, 전 API zod, shadcn 삭제, PrayerTopic

## 3. 작업 분해

### G001 — Preferences + consent + safety + rate-limit libs & wire critical APIs

**신규**
- `src/lib/user-preferences.ts` — flags loader, error messages/codes (`CONSENT_AI`, `CONSENT_COMMUNITY`)
- `src/lib/rate-limit.ts` — sliding window, `checkRateLimit`, `resetRateLimitForTests`
- `src/lib/past-today.ts` — `pastTodayDateRanges(now, yearsBack)`, optional `isSameCalendarDay`

**수정 API**
1. `POST src/app/api/reviews/route.ts`  
   - flags.aiProcessingConsent else 403  
   - rate `reviews:create` 5/hour  
   - then existing logic  
2. `POST src/app/api/together/route.ts`  
   - flags.communityEnabled else 403  
   - rate `together:create` 20/hour  
   - safety blocked → 400 **without** create  
   - if tags empty && need MiMo: also require aiProcessingConsent before generate (or 403)  
3. `POST src/app/api/together/tags/route.ts`  
   - ai consent + rate `together:tags` 30/hour  
4. `POST src/app/api/uploads/route.ts` — rate `uploads` 40/hour  
5. `POST src/app/api/contact/route.ts` — rate `contact` 10/hour (userId or x-forwarded-for / unknown)

**UI**
- `reviews/new/page.tsx`: !aiProcessingConsent → 설정 안내, 폼 숨김  
- optional: together composer disable (nice)

**테스트**
- `tests/rate-limit.test.ts`
- `tests/user-preferences.test.ts` (constants + any pure helpers)
- safety: extract `shouldPersistSharedReflection(safety)` or test scan+policy inline in together-tags/safety if scan is local

### G002 — Today query + pastToday flag + README

**수정**
- `src/app/today/page.tsx`:  
  - load flags  
  - single entries query take 40 for recent+fallback  
  - pastToday only if enabled, using `pastTodayDateRanges` + findMany/findFirst  
  - remove take 400 filter  
- `README.md` 주요 기능에 다시 머물 본문  
- `tests/past-today.test.ts`

## 4. 고정 카피

- AI 403: `AI 회고를 쓰려면 설정에서 기록 외부 처리 허용이 필요합니다.`
- Community 403: `함께 나눔을 쓰려면 설정에서 익명 피드 참여를 켜 주세요.`
- Rate 429: `요청이 잠시 많았습니다. 잠시 후 다시 시도해 주세요.`
- reviews/new 안내: 설정으로 이동 링크 `/me/settings`

## 5. 검증

```bash
bun test tests/rate-limit.test.ts tests/past-today.test.ts tests/user-preferences.test.ts
bun test tests/reread-scriptures.test.ts tests/bible.test.ts tests/lib.test.ts tests/actions.test.ts tests/together-tags.test.ts
```

수동:
- consent off → reviews POST 403  
- community off → together 403  
- pastToday off → 섹션 없음  
- safety 개인정보 패턴 → 400 & DB 무행 (가능 시)

## 6. DoD

설계 §11 전체.

## 7. 체크리스트

- [ ] libs + tests  
- [ ] API wires  
- [ ] reviews/new UI  
- [ ] today optimize + flag  
- [ ] README  
- [ ] bun test green (non-DB)
