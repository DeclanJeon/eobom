# 이야기 거울 — 95% 완성을 위한 설계 문서 v3.0

- 작성: 2026-07-28
- 기반: v1.2 + v2.0 + 현재 구현 상태
- 현재: 78% → 목표: 95%

---

## 격차 분석

| 영역 | 현재 | 목표 | 격차 |
|------|------|------|------|
| 권리는수집 | 70% | 95% | passage 데이터, 한국고전 rights approval |
| 개인정보 | 85% | 95% | 설정 UI 토글 컴포넌트 실제 렌더링 |
| 매칭 | 70% | 95% | 문화권 다양성 감점, 임베딩 연동 확인 |
| 안전 | 60% | 95% | 전체 파이프라인 통합 |
| API/UI | 85% | 95% | runs/:id, 폴링, 피드백 UI |
| 품질 | 60% | 95% | 평가 세트 실행, 출시 게이트 검증 |
| 시각화 | 80% | 95% | 비동기 잡 폴링, 에러 핸들링 |

---

## 1. passage 데이터 구축

### 1.1 현재 상태
- `StoryPassage` 모델 존재
- 카드에 핵심 구절 JSON이 `keyPassages`로 존재
- DB에는 passage 레코드 없음

### 1.2 구현
- `seed-corpus.ts`에 passage 주입 로직 추가
- 각 카드의 `keyPassages` JSON에서 passage 레코드 생성
- `StoryEdition`도 카드별 1개씩 생성 (stub)
- `citationAllowed`: 성경만 true, 나머지 false

---

## 2. 한국 고전 rights approval

### 2.1 현재 상태
- 8개 한국 고전 카드: `rightsStatus: "review"`, `reviewStatus: "draft"`
- 한국고전번역원 공공데이터는 "출처표시" 조건

### 2.2 구현
- 한국고전 공공데이터 API 약관 확인
- "출처표시"이면 `rightsStatus: "approved"`, `allowedActions: ["link", "cite"]`
- 카드 `reviewStatus`를 `published`로 전환
- sources.manifest.json 업데이트

---

## 3. 설정 UI 토글

### 3.1 현재 상태
- Prisma 필드 추가됨 (`storyMirrorEnabled`, `storyMirrorExternalConsent`)
- `/me/settings` 페이지에 토글 미연결

### 3.2 구현
- `settings-form.tsx`에 토글 추가
- `GET /api/me`에서 해당 필드 반환
- `POST /api/me`에서 업데이트 허용
- 토글 상태에 따라 StoryMirrorHomeCard 표시/숨김

---

## 4. API runs/:id + 폴링

### 4.1 현재 상태
- `GET /api/story-mirror` — 최신 run 조회
- `POST /api/story-mirror/runs` — 매칭 실행
- `GET /api/story-mirror/runs/:id` — 미구현

### 4.2 구현
- `GET /api/story-mirror/runs/[id]/route.ts` 생성
- 시각화 폴링: `GET /api/story-mirror/visualize`에서 `status` 확인
- 클라이언트에서 5초 간격 폴링 → 완료 시 이미지 표시

---

## 5. 상세 페이지 피드백 UI

### 5.1 현재 상태
- `POST /api/story-mirror/matches/[id]/feedback` API 존재
- 상세 페이지에 피드백 버튼 미연결

### 5.2 구현
- story-mirror/[id]/page.tsx에 피드백 버튼 추가
- 도움됨/관련없음/민감함/숨기기 4종
- 피드백 전송 후 "감사합니다" 확인 메시지

---

## 6. 문화권 다양성 감점

### 6.1 현재 상태
- matcher.ts에서 문화권 필터 없음
- 같은 문화권 카드가 과대표출 가능

### 6.2 구현
- `matchHybrid()`에 diversity penalty 추가
- 최근 N개 매칭된 카드의 culture를 추적
- 같은 culture가 2개 이상 연속되면 감점 (0.8x)

---

## 7. 평가 세트 실행 + 출시 게이트

### 7.1 구현
- `tests/story-mirror-evaluation.json`에 50개 시나리오
- `tests/story-mirror-eval.test.ts`에서 평가 실행
- precision@3, unrelated rate 측정
- 출시 게이트 자동 검증

---

## 8. 작업 지시서

### Phase F: passage + rights (1일)

| # | 작업 | 상태 |
|---|------|------|
| F-1 | seed-corpus.ts에 passage 주입 | 🔲 |
| F-2 | 한국고전 rights approval + published 전환 | 🔲 |
| F-3 | sources.manifest.json 업데이트 | 🔲 |

### Phase G: UI 연결 (1일)

| # | 작업 | 상태 |
|---|------|------|
| G-1 | settings-form.tsx에 토글 추가 | 🔲 |
| G-2 | GET/POST /api/me 연동 | 🔲 |
| G-3 | story-mirror/[id]에 피드백 UI | 🔲 |
| G-4 | 시각화 폴링 컴포넌트 | 🔲 |

### Phase H: 매칭 고도화 (1일)

| # | 작업 | 상태 |
|---|------|------|
| H-1 | 문화권 다양성 감점 | 🔲 |
| H-2 | GET /runs/:id API | 🔲 |
| H-3 | 매칭 파이프라인 통합 테스트 | 🔲 |

### Phase I: 품질 검증 (1일)

| # | 작업 | 상태 |
|---|------|------|
| I-1 | 평가 세트 50개 작성 | 🔲 |
| I-2 | 평가 실행 + precision@3 측정 | 🔲 |
| I-3 | 출시 게이트 검증 | 🔲 |
| I-4 | 전체 빌드 + 102개+ 테스트 | 🔲 |

---

## 9. 수용 기준 (95%)

- passage 레코드가 DB에 존재
- 한국 고전 카드가 published 상태
- 설정 토글이 UI에서 동작
- 피드백 버튼이 상세 페이지에 표시
- 문화권 감점이 매칭에 반영
- runs/:id API가 동작
- 평가 세트 precision@3 ≥ 0.6
- unrelated rate = 0
- 전체 102개+ 테스트 통과
- `bun run build` 성공
