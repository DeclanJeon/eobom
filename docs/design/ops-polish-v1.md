# 운영·제품 다듬기 (Ops Polish) v1 설계

- 문서 버전: **v1.0**
- 작성일: 2026-07-28
- 상태: **구현 전 설계 확정안**
- 근거: 남은 백로그 P2–P3 중 **지금 실행 가능·회귀 낮은** 항목
- 후속 실행: `docs/work-orders/WO-2026-07-28-ops-polish.md`

---

## 0. 한 줄 요약

헬스체크·세션 플래그 보강·claim-intent 검증·seats 테스트 경로 수정·문서 아카이브·PrayerTopic 후속 명시로  
**운영 가시성과 남은 작은 구멍을 닫는다.**

---

## 1. 범위

### In
| ID | 작업 |
|----|------|
| O1 | `GET /api/health` — liveness (+ optional db ping) |
| O2 | NextAuth session에 `communityEnabled`, `pastTodayEnabled` 포함 (UX 힌트; 강제 소스는 여전히 DB) |
| O3 | `POST /api/seats/claim-intent` body zod |
| O4 | seats `dbAvailable` — `file:` 상대경로 cwd 해석 |
| O5 | `docs/stitch_prd_driven_design` → `docs/archive/stitch_prd_driven_design` 이동 + 짧은 README |
| O6 | PrayerTopic **후속(deferred)** 문서 1페이지 — 모델/사이드이펙트만 있고 UI 없음 명시 |
| O7 | README 운영 노트: rate limit 단일 인스턴스, health URL |
| O8 | nginx 예시 health location (optional comment or location = /api/health) |

### Out
- PrayerTopic 풀 UI
- Redis rate limit
- 브라우저 e2e 풀
- pastToday ICU timezone 전면 개편 (세션 timezone 노출만)
- orphan sharedReflection 마이그레이션 스크립트 (별도 운영 작업)

---

## 2. Health

`src/app/api/health/route.ts`

```ts
// GET
// 200 { ok: true, service: "eobom", time: ISO, db?: "up"|"down" }
// db down → 503 { ok: false, db: "down" } when ?db=1
// default: liveness only 200 without db (fast for k8s/systemd)
```

- `?db=1` 일 때만 `db.$queryRaw` SELECT 1
- no auth
- Cache-Control: no-store

nginx: `location = /api/health { proxy_pass ... }` 기존 location / 로도 동작 — deploy conf에 주석 한 줄.

---

## 3. Session flags

`src/types/next-auth.d.ts` + `auth.ts` session callback select/assign:
- `communityEnabled: boolean`
- `pastTodayEnabled: boolean` (default true)

페이지가 이미 `getUserPreferenceFlags`를 쓰면 중복이지만 클라이언트 컴포넌트 확장 여지.

---

## 4. claim-intent

Schema: `{ slug: string }` — normalize + isKeyringSlug 기존 로직 유지, invalid → 400 VALIDATION.

---

## 5. seats test path

```ts
function resolveSqlitePath(url: string): string | null {
  if (!url.startsWith("file:")) return null;
  let p = url.slice(5);
  if (p.startsWith("/")) return p;
  return path.resolve(process.cwd(), p);
}
```

.env `file:./db/eobom.db` 와 absolute 모두 지원.

---

## 6. Docs

- move stitch tree to archive
- `docs/archive/README.md` — 디자인 아카이브, 런타임 무관
- `docs/deferred/prayer-topic.md` — 현재 createEntry 사이드이펙트, UI 없음, 향후 기도 주제함

---

## 7. DoD

1. `/api/health` 200; `?db=1` db 상태  
2. session 타입·callback에 community/pastToday  
3. claim-intent zod  
4. seats path resolve; unit still green  
5. stitch archived; deferred prayer doc  
6. README ops blurb  
7. `bun run test:unit` green  

---

## 8. 결정

| 결정 | 선택 |
|------|------|
| health default | liveness only |
| PrayerTopic | document defer, no UI this sprint |
| stitch | archive move not delete |
