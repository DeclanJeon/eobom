# 이어봄 세션 납품 보고서

| 항목 | 내용 |
|------|------|
| 일자 | 2026-07-28 |
| 제품 | 이어봄 (eobom) |
| 범위 | 본문 재방문 · 신뢰 경계 · 품질 기반 · 운영 다듬기 |
| 검증 | `bun run test:unit` → **67 pass / 0 fail** |
| 문서 정본 | `docs/design/*`, `docs/work-orders/*` |

---

## 1. 요약

이번 작업 묶음은 “성구를 운세처럼 처방하지 않으면서, 기록에 이미 등장한 본문을 다시 머물게 하고”, 그 과정에서 **동의·비용·안전·코드 건강·운영 가시성**을 서버에서 닫는 것이 목표였다.

네 개의 설계 스프린트를 Ultragoal로 순차 완료했다.

1. **다시 머물 본문 (Reread Scriptures)**  
2. **신뢰 경계 · 홈 성능 (Trust Boundaries)**  
3. **품질 기반 (Quality Foundation)**  
4. **운영·제품 다듬기 (Ops Polish)**  

---

## 2. 제품 기능

### 2.1 다시 머물 본문

| 표면 | 동작 |
|------|------|
| AI 회고 상세 | `rereadScriptures` → **「다시 머물 본문」** (본문 excerpt, 기록 CTA) |
| 오늘 홈 | 최신 회고 캐시 1–2개 또는 **「최근에 머문 본문」** fallback |
| 작성 | `/entries/new?scripture=` 시드 (로컬 draft 우선) |

**원칙 (PRD 1.7)**  
- 단일 구절 처방·신탁 톤 금지  
- 사용자 기록에 등장한 본문만 (`allowedRefs`)  
- 회고 stale: `createdAt` **또는** `periodEnd` > 90일  
- 오늘 홈: **추가 MiMo 호출 없음**

**핵심 모듈**  
- `src/lib/reread-scriptures.ts`  
- `src/components/reread-scripture-list.tsx`  
- `src/lib/entry-seed.ts`  
- 회고 저장 `promptVersion`: `eobom-review-v1.1`

### 2.2 설정 동의 서버 강제

| 플래그 | 강제 위치 |
|--------|-----------|
| `aiProcessingConsent` | `POST /api/reviews`, `POST /api/together/tags`, together 태그 자동생성 |
| `communityEnabled` | `POST /api/together` + 함께 작성 UI |
| `pastTodayEnabled` | `/today` 과거 카드 및 전용 쿼리 |

동의 판정은 **DB 재조회** (`getUserPreferenceFlags`). 세션 필드는 UX 힌트용으로 community/pastToday도 포함.

### 2.3 Together 안전

safety block 시 **DB insert 없이** 400 (`SAFETY_BLOCKED`).  
private orphan 생성 경로 제거.

---

## 3. 플랫폼 · 보안 · 성능

### 3.1 Rate limit (단일 인스턴스 메모리)

| Bucket | 한도 / 1h |
|--------|-----------|
| reviews create | 5 |
| together create | 20 |
| together tags | 30 |
| uploads | 40 |
| contact | 10 |

초과 시 **429** + `Retry-After` + `code: RATE_LIMITED`.

### 3.2 `/today` 쿼리

- entry `take: 40` 1회로 recent + fallback 공유  
- pastToday: 연도별 동일 월·일 범위 OR 조회 (`pastTodayDateRanges`)  
- 기존 `take: 400` 메모리 필터 제거  

### 3.3 API 품질

- `requireApiUser()` — 보호 API 401 JSON 통일  
- `api-schemas.ts` + zod — entries / reviews / together / tags / me / contact / actions / react / claim-intent  
- `content-scrub.ts` — mimo · reread 금지 문구 단일 출처  

### 3.4 다이어트

- 미사용 `components/ui` 대량 삭제 (**sheet / toast / toaster** 만 유지)  
- 미사용 deps 제거 (dnd-kit, recharts, 대부분 radix 등)  
- `auth-store`, `use-mobile` 삭제  

### 3.5 운영

- `GET /api/health` (기본 liveness, `?db=1` SQLite 핑)  
- README 운영 메모, nginx health 주석  
- Stitch 시안 → `docs/archive/`  
- PrayerTopic UI 없음 → `docs/deferred/prayer-topic.md`  

---

## 4. 설계 · 작업지시서 목록

| 설계 | 작업지시서 |
|------|------------|
| `docs/design/reread-scriptures-v1.md` | `docs/work-orders/WO-2026-07-28-reread-scriptures.md` |
| `docs/design/trust-boundaries-v1.md` | `docs/work-orders/WO-2026-07-28-trust-boundaries.md` |
| `docs/design/quality-foundation-v1.md` | `docs/work-orders/WO-2026-07-28-quality-foundation.md` |
| `docs/design/ops-polish-v1.md` | `docs/work-orders/WO-2026-07-28-ops-polish.md` |

---

## 5. 주요 코드 경로

### 신규 lib
- `reread-scriptures`, `entry-seed`, `user-preferences`, `rate-limit`, `past-today`, `together-safety`
- `content-scrub`, `api-schemas`, `session.requireApiUser`

### API
- reviews / together / tags / uploads / contact — consent · rate · zod  
- health — 공개 liveness  
- claim-intent — zod  

### UI
- reviews 상세 reread 섹션, reviews/new 동의 게이트  
- today reread + pastToday 플래그  
- entry-form scripture seed  
- together-composer community 게이트  

### 테스트
- `bun run test:unit` (DB 불필요)  
- `bun run test:seats` (SQLite 파일 있을 때)  
- 신규: reread, rate-limit, user-preferences, past-today, api-schemas, content-scrub  

---

## 6. 에러 코드 계약 (요약)

| code | HTTP | 의미 |
|------|------|------|
| `CONSENT_AI` | 403 | AI 외부 처리 미허용 |
| `CONSENT_COMMUNITY` | 403 | 함께 참여 꺼짐 |
| `RATE_LIMITED` | 429 | 호출 한도 |
| `SAFETY_BLOCKED` | 400 | 함께 본문 안전 실패 (미저장) |
| `VALIDATION` | 400 | zod/입력 검증 실패 |

---

## 7. 검증

```text
bun run test:unit
→ 67 pass / 0 fail
```

Ultragoal 각 스프린트 G001–G002 complete (reread, trust, quality, ops).

---

## 8. 의도적 후속 (미구현)

| 항목 | 비고 |
|------|------|
| PrayerTopic UI | deferred 문서만 |
| Redis rate limit | 멀티 인스턴스 시 |
| 브라우저 e2e / 실 MiMo 수동 QA | 자동 스위트 외 |
| pastToday ICU 타임존 전면 개편 | 서버 Date 기준 유지 |
| orphan private sharedReflection 일괄 정리 | 운영 선택 |
| 작성 폼 opt-in 성구 연결 | reread v1.1 후보 |

---

## 9. 배포 시 유의사항

1. 단일 인스턴스 rate limit — 스케일 아웃 시 공유 스토어 필요  
2. AI 회고·태그·함께는 설정 동의 없으면 403 — 기존 미동의 유저는 설정 CTA  
3. 헬스: `GET /api/health`, 깊이 검사 `?db=1`  
4. 배포 경로: `./deploy/deploy.sh` → ponslink `apps/eobom`, systemd `eobom`  

---

## 10. 한 줄 결론

**기록에 이미 있는 말씀을 안전하게 다시 잇고**, 동의·비용·안전·API 품질·운영 체크를 서버 쪽에 고정한 납품이다.  
신탁형 성구 추천이 아니라 **본문 재방문 + 신뢰 경계**가 제품 약속이다.
