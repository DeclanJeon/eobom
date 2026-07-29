# 이야기 거울 (Story Mirror) 구현 작업 지시서

- 작성: 2026-07-28
- 기반: `docs/design/story-mirror-v1.md` (v1.1 검토 반영)
- 상태: **진행 중**

---

## 작업 목록

### Phase 0: 데이터 레이어

| # | 작업 | 상태 | 산출물 |
|---|------|------|--------|
| 0-1 | Prisma 스키마에 StoryWork·StoryEdition·StoryCard·StoryPassage·StoryCardEmbedding·StoryMirrorRun·StoryMirrorMatch·StoryMirrorEvidence·StoryMirrorFeedback 모델 추가 | 🔲 | `prisma/schema.prisma` |
| 0-2 | `prisma db push` 마이그레이션 실행 | 🔲 | DB 동기화 |
| 0-3 | 제어 어휘(controlled vocabulary) 정의 — themes·emotions·situations | 🔲 | `src/lib/story-mirror/vocab.ts` |
| 0-4 | 성경 인물 시드 데이터 구축 | 🔲 | `src/lib/story-mirror/seed/bible-characters.ts` |
| 0-5 | 한국 고전 시드 데이터 구축 | 🔲 | `src/lib/story-mirror/seed/korean-classics.ts` |
| 0-6 | 세계 고전 시드 데이터 구축 | 🔲 | `src/lib/story-mirror/seed/world-classics.ts` |
| 0-7 | 시드 데이터 통합 + DB 시드 스크립트 | 🔲 | `scripts/story-mirror/seed-corpus.ts` |

### Phase 1: 매칭 코어

| # | 작업 | 상태 | 산출물 |
|---|------|------|--------|
| 1-1 | 사용자 프로파일 추출기 (entries → themes·emotions·scriptures) | 🔲 | `src/lib/story-mirror/user-profile.ts` |
| 1-2 | 매칭 알고리즘 — 태그·키워드 기반 기준선 (Phase A) | 🔲 | `src/lib/story-mirror/matcher.ts` |
| 1-3 | 매칭 설명 템플릿 (LLM 불필요, 결정적 템플릿) | 🔲 | `src/lib/story-mirror/narrative-bridge.ts` |
| 1-4 | 입력 fingerprint + 캐시 관리 | 🔲 | `src/lib/story-mirror/cache.ts` |

### Phase 2: API

| # | 작업 | 상태 | 산출물 |
|---|------|------|--------|
| 2-1 | `GET /api/story-mirror` — 매칭 결과 조회 | 🔲 | `src/app/api/story-mirror/route.ts` |
| 2-2 | `POST /api/story-mirror/runs` — 매칭 실행 | 🔲 | `src/app/api/story-mirror/runs/route.ts` |
| 2-3 | `POST /api/story-mirror/matches/[id]/dismiss` — 매칭 숨김 | 🔲 | `src/app/api/story-mirror/matches/[id]/dismiss/route.ts` |
| 2-4 | `POST /api/story-mirror/matches/[id]/feedback` — 피드백 | 🔲 | `src/app/api/story-mirror/matches/[id]/feedback/route.ts` |
| 2-5 | `GET /api/story-mirror/cards` — 카드 catalog 조회 | 🔲 | `src/app/api/story-mirror/cards/route.ts` |
| 2-6 | `GET /api/story-mirror/cards/[id]` — 카드 상세 | 🔲 | `src/app/api/story-mirror/cards/[id]/route.ts` |

### Phase 3: UI

| # | 작업 | 상태 | 산출물 |
|---|------|------|--------|
| 3-1 | 오늘 홈 "이야기 거울" 요약 카드 | 🔲 | `src/components/story-mirror-home-card.tsx` |
| 3-2 | 이야기 거울 메인 페이지 | 🔲 | `src/app/story-mirror/page.tsx` |
| 3-3 | 이야기 거울 상세 페이지 (카드별) | 🔲 | `src/app/story-mirror/[id]/page.tsx` |

### Phase 4: QA·테스트

| # | 작업 | 상태 | 산출물 |
|---|------|------|--------|
| 4-1 | 제어 어휘 단위 테스트 | 🔲 | `tests/story-mirror-vocab.test.ts` |
| 4-2 | 매칭 알고리즘 단위 테스트 | 🔲 | `tests/story-mirror-matcher.test.ts` |
| 4-3 | API 스키마 검증 테스트 | 🔲 | `tests/story-mirror-api.test.ts` |
| 4-4 | 시드 데이터 무결성 테스트 | 🔲 | `tests/story-mirror-seed.test.ts` |
| 4-5 | `bun run test` 전체 실행 + 회귀 확인 | 🔲 | 기존 테스트 깨지 않음 |

### Phase 5: 빌드·배포 검증

| # | 작업 | 상태 | 산출물 |
|---|------|------|--------|
| 5-1 | `bun run build` 빌드 성공 | 🔲 | 빌드 에러 없음 |
| 5-2 | TypeScript 진단 확인 | 🔲 | tsc 에러 없음 |

---

## 수용 기준 (Design v1.1 기반)

- Prisma 마이그레이션 에러 없음
- 매칭 알고리즘: 동의 없으면 외부 API 호출 없음
- 매칭 결과에 `corpusVersion`, `matcherVersion`, `consentSnapshot` 기록
- 사용자 evidence는 FK cascade로 삭제 연동
- GET은 읽기 전용, 생성은 POST
- 모든 API에 `requireApiUser` 적용
- 제어 어휘: 한국어 기반, stopword 미포함
- 시드 데이터: 각 카드에 `workId`, `themes`, `emotions`, `summary` 존재
- 카드 `reviewStatus`가 `published`인 것만 노출
- 테스트: 기존 10개 테스트 파일 모두 통과
