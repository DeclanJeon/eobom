# 작업지시서: 품질 기반 (Quality Foundation) v1

| 항목 | 내용 |
|------|------|
| ID | **WO-2026-07-28-quality-foundation** |
| 작성일 | 2026-07-28 |
| 상태 | **Ready for implementation** |
| 설계 | `docs/design/quality-foundation-v1.md` |

---

## G001 — API foundation: session, zod, scrub

### 구현
1. `src/lib/session.ts` — `requireApiUser()` → 401 JSON or user
2. `src/lib/api-schemas.ts` + `parseJsonBody` — entries, reviews, together, tags, me, contact, actions patch, react
3. Wire priority routes to requireApiUser + parseJsonBody (keep trust-boundaries consent/rate order: auth → consent → rate → validate body → logic)
4. `src/lib/content-scrub.ts` — shared patterns; update mimo.ts + reread-scriptures.ts
5. Tests: `tests/api-schemas.test.ts`, `tests/content-scrub.test.ts`; extend session if pure possible
6. Replace getServerSession in protected API routes listed in design

### 검증
- Unauthorized path still 401
- Invalid JSON/body 400 code VALIDATION
- scrub tests cover base + scripture extras
- existing unit tests still pass

## G002 — Test scripts, seats skip, dead code diet, composer gate

### 구현
1. package.json: `test:unit`, `test:seats`; default `test` = unit-first or document
2. seats.test.ts: probe DB, skip DB-dependent describes if unavailable
3. tsconfig: include bun-types for tests (or exclude tests from main tsc)
4. Delete unused `src/components/ui/*` except sheet/toast/toaster; delete use-mobile; delete auth-store
5. Remove unused package deps (dnd-kit, recharts, embla, cmdk, vaul, input-otp, react-day-picker, tanstack table/query, zustand if unused); bun install
6. together page: pass communityEnabled; composer/share disable when false
7. Optional: remove unused radix packages if safe after ui delete

### 검증
- `bun run test:unit` green without seats DB
- app still imports sheet/toaster only
- grep auth-store = 0
- build or bun import smoke for entry points

## Out
Redis, full e2e, PrayerTopic, aggressive radix purge if build breaks (stop and keep)

## DoD
설계 §10
