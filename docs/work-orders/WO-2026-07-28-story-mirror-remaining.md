# 이야기 거울 — 잔여 구현 작업 지시서

- 작성: 2026-07-28
- 기반: `docs/design/story-mirror-remaining-v2.md`
- 상태: **진행 중**

---

## Phase A: 권리 + 수집 (3일)

| # | 작업 | 상태 | 산출물 | 수용 기준 |
|---|------|------|--------|-----------|
| A-1 | `sources.manifest.json` 작성 | 🔲 | `data/story-mirror/sources.manifest.json` | 28개 카드 모두 기록 |
| A-2 | `01-fetch-gutendex.ts` 구현 | 🔲 | Gutendex 메타데이터 수집 | `copyright=false` 필터 통과 |
| A-3 | `07-validate-rights.ts` 구현 | 🔲 | 권리 검증 | unknown→candidate 전환 |
| A-4 | `05-normalize-source.ts` 구현 | 🔲 | 메타데이터 정규화 | 중복 제거 |
| A-5 | 카테고리별 10권 추가 시드 | 🔲 | 총 38개 카드 | 각 카드에 themes+emotions |

## Phase B: 개인정보 + 안전 (2일)

| # | 작업 | 상태 | 산출물 | 수용 기준 |
|---|------|------|--------|-----------|
| B-1 | Prisma 동의 필드 추가 | 🔲 | 스키마 업데이트 | db push 성공 |
| B-2 | `/me/settings` 토글 UI | 🔲 | 설정 컴포넌트 | 토글 동작 |
| B-3 | 위기 감지 구현 | 🔲 | `story-mirror-safety.ts` | 위기 키워드 제외 |
| B-4 | 금지 표현 필터 | 🔲 | narrative-bridge 강화 | 필터 통과 |

## Phase C: 임베딩 + LLM (3일)

| # | 작업 | 상태 | 산출물 | 수용 기준 |
|---|------|------|--------|-----------|
| C-1 | 임베딩 생성기 | 🔲 | `build-embeddings.ts` | 카드별 벡터 저장 |
| C-2 | Phase B 매칭 | 🔲 | matcher.ts 강화 | cosine similarity 동작 |
| C-3 | Phase C LLM 설명 | 🔲 | MiMo 연동 | 설명 생성 + 폴백 |

## Phase D: 품질 + 폴백 (2일)

| # | 작업 | 상태 | 산출물 | 수용 기준 |
|---|------|------|--------|-----------|
| D-1 | 평가 세트 50개 | 🔲 | evaluation.json | precision@3 측정 |
| D-2 | HTML/CSS 폴백 | 🔲 | `visualization-fallback.tsx` | 이미지 없이 렌더링 |

## Phase E: 테스트 + 빌드 (1일)

| # | 작업 | 상태 | 산출물 | 수용 기준 |
|---|------|------|--------|-----------|
| E-1 | API 테스트 | 🔲 | `story-mirror-api.test.ts` | 엔드포인트 검증 |
| E-2 | 전체 빌드 + 회귀 | 🔲 | `bun run build` | 89개+ 테스트 통과 |

---

## 검증 순서

```
A-1 → A-2 → A-3 → A-4 → A-5 → (rights manifest 확인)
B-1 → B-2 → B-3 → B-4 → (개인정보·안전 검증)
C-1 → C-2 → C-3 → (매칭 품질 검증)
D-1 → D-2 → (폴백 검증)
E-1 → E-2 → (전체 검증)
```

## 최종 수용 기준

- rights manifest에 28개 카드 모두 기록
- `unknown` 권리 카드 production 미노출
- `storyMirrorEnabled` 토글 동작
- 위기 기록 매칭 제외
- 금지 표현 매칭 이유 미포함
- 기존 89개 + 신규 테스트 통과
- `bun run build` 성공
