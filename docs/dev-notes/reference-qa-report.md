# eobom 절별 연관성구 + 장 배경 — QA 보고서

> 작성일: 2026-08-22 / 대상: `eobom` (bible은 원천으로만 활용, 수정 없음)
> 검증 범위: 테스트 스위트 → 타입·린트·빌드 → 데이터 무결성 → API·라이브러리 → UI·접근성·취향

---

## 1. 요약

66권 1,189장(ko 1,171장) · 31,098절 규모의 절별 연관성구 하이퍼링크와 장별 6필드 배경을 eobom에 통합했다. CSV는 `한 줄=한 링크` edge-list로 678,161건을 유지하고, 런타임은 `DatabaseSync(readOnly)` SQLite 참조 DB(Prisma 밖)로 분리했다. 묵상 상세(`entries/[id]`)에서 절별 본문을 per-verse로 분해하고 연관성구를 `details` 접힘으로, 장 배경을 상단 카드로 노출한다. 전체 QA 5단계를 통과했다.

| 항목 | 결과 |
|---|---|
| 테스트 | 403 pass / 0 fail (49 files, 1,198 expect) + 신규 `reference.test.ts` 6 pass |
| 타입체크 | `tsc --noEmit` 0 error |
| 린트 | `eslint` 0 error |
| 빌드 | `next build` 성공 (한 차례 실패 후 수정, standalone에 `data/reference` 포함) |
| 데이터 | CSV 678,162 lines / by-verse 29,383 / SQLite 678,161 (=CSV) / chapter 2,360 rows 일치 |
| API | `crossrefs`/`chapter-background` 200/400 정상, `Cache-Control: public, max-age=86400` |
| UI | per-verse 분해 + grouped 1회 fetch + 빈 블록 숨김 + 조용한 디자인 유지 |

---

## 2. 범위와 결정

- **작업 대상은 eobom만.** bible에 생성된 `ingest_chapter_background.py`, `build-crossref-csv.mjs`, `chapter-background.sqlite` 등은 원천으로만 사용하고 더 이상 수정하지 않았다. bible 수정분은 그대로 둔다는 사용자 지시에 따름.
- **CSV가 진실:** `bible/data/knowledge/crossrefs.csv` 67MB를 `eobom/data/reference/crossrefs.csv`로 복사해 공유 자산화. 헤더에 `source_ref/target_ref`(사람 읽기 `GEN 1:1`), `source_code/chapter/verse`(기계용), `source_name/license`를 동시 보유 — 취향 3종(`edge-list + 사람 읽기 컬럼 + 라이선스 컬럼`) 충족.
- **런타임은 SQLite 참조 DB:** `crossrefs.sqlite(openbible_links 341,294 + phrase_links 336,867)` + `chapter-background.sqlite(2,360)`를 `data/reference/`에 두고 `DatabaseSync(readOnly)` + `PRAGMA query_only`로 조회. Prisma 마이그레이션 없이 `public, max-age=86400` 캐시.
- **UI는 조용함 유지:** 기본 접힘(`details/summary`), Top 8 미리보기, 0개면 미렌더, `writing-margin`·`SurfaceCard` 리듬 유지.

---

## 3. 산출물

### 3.1 데이터 (`eobom/data/reference/` — 150MB)

| 파일 | 크기 | 내용 |
|---|---|---|
| `crossrefs.csv` | 67M | 678,161 edges, 헤더 1 + CC BY 4.0 / CC BY-SA 4.0 혼합 |
| `crossrefs-by-verse.csv` | 616K | 29,383 verses, `verse_ref,edge_count` 요약 (최다 `ACT 24:25=197`) |
| `crossrefs.sqlite` | 73M | `openbible_links` + `phrase_links` + `metadata`, `from_key` 인덱스 |
| `chapter-background.sqlite` | 4.8M | 2,360 rows (`ko 1,171 / en 1,189`), 6필드 `overview/historical/literary/theological/keyVerses/cautions` + `sources[](STEPBible/CC BY, local)` |
| `chapter-background-ko/en.json` | 2.8M/2.7M | 원본 보관, 스켈레톤 검증용 |

동기화: `scripts/sync-reference-data.mjs` (`bible → eobom` 복사) + `scripts/build-reference-sqlite.mjs` (CSV→SQLite 재생성)

### 3.2 코드

| 파일 | 역할 |
|---|---|
| `src/lib/bible/crossrefs.ts` | `getCrossRefsForVerse` / `getCrossRefsForPassage` / `getCrossRefsGroupedForPassage` (grouped 1회) |
| `src/lib/bible/chapter-background.ts` | `getChapterBackground({code,chapter,locale})` (ko 결손 시 en fallback) |
| `src/app/api/bible/crossrefs/route.ts` | `GET ?code&chapter&verse` / `?slug=GEN-1-1` / `?grouped=1`, 400/400 통일 |
| `src/app/api/bible/chapter-background/route.ts` | `GET ?code&chapter`, 400/404 |
| `src/components/scripture/scripture-passage-card.tsx` | 서버 컴포넌트, `getPassageFromRef`로 verses 분해 + `PassageAnnotationList` |
| `src/components/scripture/passage-annotation-list.tsx` | client, passage 1회 grouped fetch → 절별 `details` |
| `src/components/scripture/chapter-background-card.tsx` | 장 배경 카드 (overview gold-soft + 2컬럼 + cautions) |
| `src/app/entries/[id]/page.tsx` | `excerpt` 한 덩어리 → per-verse 분해 + 장 배경 1개 상단 |
| `src/components/scripture/scripture-preview-card.tsx` | 에디터용 excerpt 유지(quiet) — 상세와 역할 분리 |
| `tests/reference.test.ts` | CSV/JSON 6케이스 |

제거: `verse-block.tsx` / `verse-annotation-list.tsx` (N+1 구 컴포넌트, 배치화로 고아)

### 3.3 설정

- `package.json` `build`에 `cp -r data/reference/* .next/standalone/data/reference/` 추가 — 운영 누락 해소, 빌드 후 standalone 150M 복사 검증
- `package.json` scripts: `sync:reference`, `build:reference-db`
- `.gitignore`에 `data/reference/*.sqlite-shm`, `*.sqlite-wal` 추가

---

## 4. QA — 5단계 전량 검증

### 4.1 테스트 스위트

- **명령:** `bun run pretest && bun test tests/` (FTS 재생성 포함)
- **결과:** 403 pass / 0 fail (49 files, 1,198 expect) — 기존 회귀 없음
- **신규:** `tests/reference.test.ts` 6 pass — CSV 헤더/`source_ref`/`license`, 678,162 lines, `GEN 1:1=123`, 라이선스 혼합, by-verse 29,383, `ko 1,171/en 1,189`
- **주의:** `node:sqlite`는 bun 미지원이라 `crossrefs.ts` 직접 테스트는 불가 — CSV/JSON 파일 검증으로 대체하고 `node -e`에서 `DatabaseSync` 카운트(123/197)로 교차 검증

### 4.2 타입·린트·빌드

- `npx tsc --noEmit` 0, `npm run lint` 0
- `next build` 1회 실패 → 수정 후 성공:
  - 실패 원인: `scripture-passage-card.tsx`가 `getPassageFromRef(node:fs)`를 직접 import해 `entry-form.tsx`(client) 번들로 유입 → Turbopack `external node:fs` 에러
  - 수정: `scripture-preview-card.tsx`를 `excerpt`만 표시로 되돌리고(에디터 quiet 유지), `scripture-passage-card.tsx`는 상세(server) 전용으로 분리

### 4.3 데이터 무결성

| 체크 | 기대 | 실제 | 판정 |
|---|---|---|---|
| `crossrefs.csv` lines | 678,162 | 678,162 | ✅ |
| `crossrefs-by-verse.csv` lines | 29,383 | 29,383 | ✅ |
| `GEN 1:1` count | 123 | 123 | ✅ |
| `ACT 24:25` (최다) | 197 | 197 | ✅ |
| `crossrefs.sqlite` 합계 | 678,161 | 341,294+336,867=678,161 | ✅ |
| `chapter-background.sqlite` | 2,360 (1,171/1,189) | 2,360 | ✅ |
| `license` 컬럼 | CC BY 4.0 / CC BY-SA 4.0 | 전량 보유 | ✅ |
| `GEN 1:1` 샘플 | `JOH 1:1-3 369` 등 | 일치 | ✅ |
| `2CH 30 ko` fallback | EN으로 보임 | true | ✅ |
| `XXX` invalid | null/0 | null/0 | ✅ |

### 4.4 API·라이브러리

| API | 요청 | 기대 | 실제 |
|---|---|---|---|
| `GET /api/bible/crossrefs?code=GEN&chapter=1&verse=1` | 200 | total 123, license CC BY | ✅ 200/123 |
| `?slug=ACT-24-25` | 200 | 197 | ✅ |
| `?code=GEN&chapter=1&verse=1&endVerse=3&grouped=1` | 200 | total 178, byVerse 3 | ✅ |
| `?slug=GEN-1-1-3&grouped=1` | 200 | 178 | ✅ |
| `?code=XXX&chapter=1&verse=1` | 400 invalid book | 400 | ✅ (수정 전 200/0 불일치 해소) |
| `?slug=XXX-1-1` | 400 invalid slug | 400 | ✅ |
| `GET /api/bible/chapter-background?code=GEN&chapter=1` | 200 overview | 200 | ✅ |
| `?code=XXX&chapter=1` | 400 | 400 | ✅ |
| `GET /api/bible/passage?code=GEN&chapter=1&startVerse=1` | 200 | verse 1:1 | ✅ |
| `Cache-Control` | public, max-age=86400 | — | ✅ |

라이브러리: `getCrossRefsForVerse` limit/total, `getCrossRefsGroupedForPassage` byVerse, `getChapterBackground` fallback 모두 검증.

### 4.5 UI·접근성·취향

- `entries/[id]/page.tsx` — `excerpt` 단일 `<p>` → `ScripturePassageCard`로 `verse 번호(mono text-label-xs) + text-body-lg` per-verse 분해, 각 절 내부가 아니라 passage 단위 `PassageAnnotationList` 1회로 grouped 조회해 절별 `details`에 분배 (N+1 → 1 개선)
- `ChapterBackgroundCard` — 첫 성구 기준 1개가 성구 카드들 위에 노출, `overview(gold-soft)` + `historical/theological` 2컬럼 + `literary/cautions` + 출처
- 빈 블록: 연관 0개면 `details` 미렌더(조용함 유지), 과밀 197개도 8개 미리보기 + `외 N개는 CSV에서 확인`
- 접근성: `details/summary` 키보드 포커스, 44px 타깃, prose는 `text-body-lg leading-relaxed`

취향 3종 재확인:
- CSV 한 줄=한 링크 edge-list ✅
- 사람 읽기 `GEN 1:1`/`GEN 1:1-3` + 기계용 `GEN/1/1` 동시 보유 ✅
- `license`/`source_name` 컬럼 포함 ✅
- verse별 annotation (장 단위만이 아님) ✅

---

## 5. 수정한 결함

| # | 결함 | 수정 |
|---|---|---|
| 1 | `crossrefs.ts`가 단일 `crossref_edges` 조회 → `no such table` | `openbible_links`/`phrase_links`로 분리 조회 + 합산 정렬 |
| 2 | API `XXX`가 crossrefs 200/0 vs chapter 400 불일치 | `isValidBookCode` 검증 추가로 둘 다 400 `invalid book/slug` 통일 |
| 3 | 절마다 `fetch`(6절=6회) N+1 | `getCrossRefsGroupedForPassage` + `?grouped=1`로 passage 1회, UI를 `PassageAnnotationList`로 교체 |
| 4 | `next build` Turbopack `node:fs` external | `scripture-preview-card`를 서버 의존 없이 `excerpt`로 되돌리고 `scripture-passage-card`는 server 전용 분리 |
| 5 | `data/reference`가 standalone에 미포함 | `build`에 `cp -r data/reference` 추가, 빌드 후 150M 복사 검증 |
| 6 | 고아 `verse-block`/`verse-annotation-list` | 삭제 |
| 7 | `*.sqlite-shm/wal` 임시파일 커밋 위험 | 삭제 + `.gitignore` 추가 |

---

## 6. 남은 권장 사항

- **선택:** 대용량 `data/reference/` 150M 일반 커밋 시 클론 무거움 — `.gitattributes` LFS 또는 CI에서 `sync:reference` 재생성 중 택1 고려. 현재는 직접 커밋 전제.
- **선택:** `tests/reference.test.ts`를 `node:sqlite` 직접 검증으로 승격 — bun이 `node:sqlite`를 지원하면 `DatabaseSync` 카운트 케이스 추가.
- **선택:** `reread-scripture-list.tsx`에도 동일 grouped 주석 확장 — 1차는 상세만, 2차에 적용.

---

## 7. 재현

```bash
# 동기화 (bible → eobom)
bun run sync:reference          # 또는 node scripts/sync-reference-data.mjs
node scripts/build-reference-sqlite.mjs  # CSV→SQLite 재생성(선택)

# 검증
bun test                         # 403 pass
npx tsc --noEmit && npm run lint # 0 error
bun run build                    # standalone에 data/reference 포함 확인
grep "^GEN,1,1," data/reference/crossrefs.csv | wc -l  # 123
```

---

## 8. 파일 목록 (이번 작업)

```
eobom/
  data/reference/
    crossrefs.csv, crossrefs-by-verse.csv
    crossrefs.sqlite, chapter-background.sqlite, chapter-background-ko/en.json
  scripts/
    sync-reference-data.mjs, build-reference-sqlite.mjs
  src/lib/bible/
    crossrefs.ts, chapter-background.ts
  src/app/api/bible/
    crossrefs/route.ts, chapter-background/route.ts
  src/components/scripture/
    scripture-passage-card.tsx, passage-annotation-list.tsx, chapter-background-card.tsx
  src/app/entries/[id]/page.tsx  (per-verse 분해 + 장 배경)
  tests/reference.test.ts
```

bible 원천은 수정 없이 유지됨.
