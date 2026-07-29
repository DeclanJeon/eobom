# 이야기 거울 — 잔여 구현 설계 문서 v2.0

- 작성: 2026-07-28
- 기반: `docs/design/story-mirror-v1.md` (v1.2)
- 상태: 잔여 구현 설계안
- 대상: 현재 58%에서 100%까지

---

## 0. 현재 상태 요약

| 영역 | 현재 | 목표 |
|------|------|------|
| Prisma 모델 | 10개 ✅ | 10개 ✅ |
| 매칭 코어 | Phase A만 ✅ | Phase A + B + C |
| API | 8개 ✅ | 9개 (+runs/:id) |
| UI | 3개 + 시각화카드 ✅ | 3개 + 시각화카드 + 폴백 |
| 시각화 | 데이터추출+이미지 생성 ✅ | + 비동기 잡 모델 |
| 시드 데이터 | 28개 카드 ✅ | 28개 + rights manifest |
| 테스트 | 89개 ✅ | 89개 + API 테스트 |

---

## 1. 권리 매니페스트 + 수집 파이프라인

### 1.1 권리 매니페스트 JSON

`data/story-mirror/sources.manifest.json` — 항목별 권리·출처·checksum·상태를 기록한다.

```json
{
  "version": "1.0",
  "createdAt": "2026-07-28",
  "works": [
    {
      "slug": "bible-david-psalms",
      "sourceKind": "bible",
      "rightsRegion": "KR",
      "rightsBasis": "link_only",
      "rightsStatus": "approved",
      "rightsCheckedAt": "2026-07-28",
      "rightsCheckedBy": "declan",
      "rightsNotes": "성경 본문은 공식 링크만 제공. 전문 저장 안함.",
      "allowedActions": ["link", "cite"],
      "sourceUrl": "https://www.bible.com/ko",
      "checksum": null
    }
  ]
}
```

### 1.2 수집 스크립트

| 스크립트 | 역할 | 상태 |
|----------|------|------|
| `01-fetch-gutendex.ts` | Gutendex API에서 메타데이터 수집 | 🔲 |
| `02-fetch-standard-ebooks.ts` | Standard Ebooks 메타데이터 수집 | 🔲 |
| `03-import-korean-open-data.ts` | 한국고전 공공데이터 수집 | 🔲 |
| `04-import-bible-cards.ts` | 성경 인물 시드 (이미 구현됨) | ✅ |
| `05-normalize-source.ts` | 수집된 메타데이터 정규화 | 🔲 |
| `06-build-card-drafts.ts` | AI로 StoryCard 초안 생성 | 🔲 |
| `07-validate-rights.ts` | 권리 상태 검증 + manifest 생성 | 🔲 |
| `08-validate-cards.ts` | 카드 품질 검증 | 🔲 |
| `09-build-embeddings.ts` | 카드 임베딩 생성 | 🔲 |
| `10-seed-corpus.ts` | DB 시드 (이미 구현됨) | ✅ |

### 1.3 Gutendex 수집 로직

```typescript
// Gutendex API → 메타데이터 수집
// copyright=false, languages=en 필터
// 페이지네이션 순회 (페이지당 32권)
// 10개 주제: philosophy, religion, fiction, drama, poetry, essays, biography, history, psychology, ethics
// 결과를 data/story-mirror/gutenberg-candidates.json에 저장
```

### 1.4 Rights Gate

각 작품에 대해:
1. `rightsStatus`가 `unknown`이면 `candidate`로 변경
2. `rightsRegion` 확인 (KR/US/world)
3. 한국 법역 검토 통과 시 `approved`
4. 통과 못하면 `link_only` (링크만 제공)
5. `sources.manifest.json`에 기록

---

## 2. 개인정보 동의 토글

### 2.1 Prisma 추가

```prisma
model User {
  ...
  storyMirrorEnabled              Boolean  @default(false)
  storyMirrorExternalConsent      Boolean  @default(false)
  storyMirrorLastConsentVersion   String?
}
```

### 2.2 설정 UI

`/me/settings`에 토글 추가:
- "이야기 거울 사용" (`storyMirrorEnabled`)
- "기록 분석을 외부 AI에 전송 허용" (`storyMirrorExternalConsent`)

### 2.3 API 연동

- `POST /api/story-mirror/runs`에서 `storyMirrorEnabled` 확인
- `storyMirrorExternalConsent`가 false이면 Phase B(임베딩), Phase C(LLM 설명) 비활성화
- 기존 `aiProcessingConsent`와 별도 관리

---

## 3. 매칭 Phase B — 임베딩

### 3.1 구조

- 카드 임베딩은 `seed-corpus.ts` 실행 시 미리 생성
- `StoryCardEmbedding` 테이블에 저장
- 사용자 프로파일 임베딩은 동의 시에만 생성

### 3.2 임베딩 생성기

`scripts/story-mirror/build-embeddings.ts`:
1. `reviewStatus = published`인 StoryCard 로드
2. 각 카드의 `summary + themes + emotions`를 하나의 텍스트로 결합
3. OpenAI text-embedding-3-small 또는 로컬 모델로 임베딩
4. `StoryCardEmbedding`에 저장 (vectorJson = JSON array of floats)
5. 코퍼스 버전과 모델명 기록

### 3.3 매칭 시 임베딩 활용

- `matcher.ts`에 `matchPhaseB()` 추가
- 사용자 프로파일 텍스트 → 임베딩 생성 (동의 시)
- 카드 임베딩과 cosine similarity 계산 (전수 스캔, 500개 이내)
- Phase A 점수와 결합: `finalScore = 0.5 × phaseA + 0.5 × similarity`

---

## 4. 매칭 Phase C — LLM 설명

### 4.1 구조

- Phase A/B에서 Top-5 후보 선별 후, LLM에게 매칭 이유 생성 요청
- 기존 `mimo.ts` 패턴 차용
- 동의 + 외부 처리 허용 시에만 실행

### 4.2 프롬프트

```
당신은 한국 기독교 묵상 앱의 이야기 거울입니다.
사용자의 묵상 기록과 고전 속 이야기를 연결하는 설명을 작성합니다.

규칙:
- "~입니다" 서술형만 사용. 판정 금지.
- "닮았습니다"는 사용하되 "당신은 ~와 같습니다"는 금지.
- 근거된 기록 날짜와 링크 포함.
- 차이와 한계 반드시 포함.
- "정답이나 진단이 아닌 읽을 거리" 고지.
- 금지: 하나님의 뜻, 신앙 판정, 결론적 권고.

사용자 기록 요약: {profile_summary}
매칭된 이야기: {card_name} ({work_title})
매칭된 주제: {matched_themes}
매칭된 감정: {matched_emotions}

1-2문장의 매칭 이유를 작성하세요.
```

### 4.3 실패 처리

- LLM 실패 시 결정적 템플릿(narrative-bridge.ts)으로 대체
- 매칭 자체를 숨기지 않음
- `matchReason`에 "설명이 준비되지 않음" 표시

---

## 5. 안전 전용 scrub

### 5.1 Story Mirror 위기 감지

기존 `together-safety.ts`의 키워드를 확장:

```typescript
const STORY_MIRROR_CRISIS_KEYWORDS = [
  "자살", "죽고싶", "죽고 싶", "자해", "타해",
  "극단적", "목숨", "끝내고 싶", "살기 싫",
];
```

- 위기 키워드 감지 시 해당 기록을 매칭 입력에서 제외
- 매칭 결과에서 해당 기록의 evidence 제거
- 사용자에게 "안전한 이야기를 찾는 중입니다" 안내

### 5.2 매칭 문구 필터

`narrative-bridge.ts`에 금지 표현 필터 추가:

```typescript
const FORBIDDEN_PATTERNS = [
  /하나님.*원하/,
  /하나님.*말씀/,
  /당신은.*사람/,
  /배워야/,
  /해결/,
  /반드시/,
  /소명/,
  /명령/,
];
```

- 매칭 이유에서 금지 표현 발견 시 해당 문구 제거 + 템플릿 대체

---

## 6. HTML/CSS 폴백 렌더링

### 6.1 목적

codex-imagen API 장애 시 이미지 없이 데이터 기반 그래프를 HTML/CSS로 렌더링한다.

### 6.2 구현

`src/components/visualization-fallback.tsx`:
- 타임라인: 수평 스크롤 바 + 날짜별 컬러 도트
- 네트워크: SVG 노드 그래프 (간단한 원+선)
- 감정 분포: CSS 스택 바 차트
- 스토리 매칭: 양쪽 컬럼 + 연결선

이미지 생성 실패 시 `VisualizationCard`가 자동으로 폴백 컴포넌트를 렌더링한다.

---

## 7. 비동기 잡 모델

### 7.1 문제

현재 이미지 생성은 동기 SSH 호출. 10~20초 블로킹.

### 7.2 해결

- `POST /api/story-mirror/visualize`는 즉시 `status: "generating"` 반환
- 백그라운드에서 `codex-imagen` 호출
- 완료 시 `status: "complete"` + `imageUrl` 업데이트
- 클라이언트는 폴링 또는 polling으로 상태 확인

### 7.3 구현

- 현재 Next.js 환경에서는 단순 polling이 적합
- `GET /api/story-mirror/visualize`로 상태 폴링
- 5초 간격 폴링, 최대 60회 (5분)
- 완료 시 이미지 표시

---

## 8. 품질 평가 세트

### 8.1 구조

`tests/story-mirror-evaluation.json` — 50개 비식별화 시나리오:

```json
[
  {
    "id": "eval-01",
    "profile": {
      "topThemes": ["인내", "신뢰와 의심"],
      "topEmotions": ["불안", "희망"],
      "entryCount": 8
    },
    "expectedCards": ["ruth-moab", "elijah-carmel"],
    "expectedUnrelated": ["hamlet-prince"],
    "category": "theme-overlap"
  }
]
```

### 8.2 카테고리

- theme-overlap (15개): 주제 유사도 기반 매칭
- emotion-overlap (10개): 감정 유사도 기반 매칭
- single-entry (5개): 단일 기록 기반 잠정 연결
- no-match (10개): 매칭 없어야 함
- crisis (5개): 위기 기록 → 매칭 제외
- cultural-diversity (5개): 문화권 과대표집 방지

### 8.3 평가 기준

- precision@3: Top-3 매칭 중 관련 있는 비율
- unrelated rate: 비관련 매칭 비율 (0 목표)
- overclaim rate: 확정적 표현 비율 (0 목표)
- crisis exclusion: 위기 기록 매칭 제외율 (100% 목표)

---

## 9. 작업 지시서

### Phase A: 권리 + 수집 (3일)

| # | 작업 | 시간 | 산출물 |
|---|------|------|--------|
| A-1 | `sources.manifest.json` 작성 (28개 카드 기준) | 0.5일 | `data/story-mirror/sources.manifest.json` |
| A-2 | `01-fetch-gutendex.ts` 구현 | 1일 | Gutendex 메타데이터 수집 |
| A-3 | `07-validate-rights.ts` 구현 | 0.5일 | 권리 검증 + manifest 자동 생성 |
| A-4 | `05-normalize-source.ts` 구현 | 0.5일 | 메타데이터 정규화 |
| A-5 | 카테고리별 10권 추가 시드 | 0.5일 | 총 38개 카드 |

### Phase B: 개인정보 + 안전 (2일)

| # | 작업 | 시간 | 산출물 |
|---|------|------|--------|
| B-1 | Prisma에 동의 필드 추가 + db push | 0.5일 | 스키마 업데이트 |
| B-2 | `/me/settings`에 토글 UI 추가 | 0.5일 | 설정 컴포넌트 |
| B-3 | Story Mirror 전용 위기 감지 구현 | 0.5일 | `story-mirror-safety.ts` |
| B-4 | 매칭 문구 금지 표현 필터 | 0.5일 | narrative-bridge.ts 강화 |

### Phase C: 임베딩 + LLM (3일)

| # | 작업 | 시간 | 산출물 |
|---|------|------|--------|
| C-1 | `09-build-embeddings.ts` 구현 | 1일 | 카드 임베딩 생성기 |
| C-2 | `matcher.ts`에 Phase B 추가 | 1일 | 벡터 유사도 매칭 |
| C-3 | Phase C LLM 설명 생성 | 1일 | MiMo 연동 + 폴백 |

### Phase D: 품질 + 폴백 (2일)

| # | 작업 | 시간 | 산출물 |
|---|------|------|--------|
| D-1 | 평가 세트 50개 작성 | 1일 | `tests/story-mirror-evaluation.json` |
| D-2 | HTML/CSS 폴백 컴포넌트 | 1일 | `visualization-fallback.tsx` |

### Phase E: 테스트 + 빌드 (1일)

| # | 작업 | 시간 | 산출물 |
|---|------|------|--------|
| E-1 | API 테스트 (visualize, runs/:id) | 0.5일 | `tests/story-mirror-api.test.ts` |
| E-2 | 전체 빌드 + 회귀 검증 | 0.5일 | `bun run build` + `bun run test` |

**총 예상 기간: 11일**

---

## 10. 수용 기준

### 필수 통과 (출시 전)

- [ ] rights manifest에 28개 카드 모두 기록
- [ ] `unknown` 권리 상태 카드가 production에서 조회되지 않음
- [ ] `storyMirrorEnabled` 토글이 설정 UI에 존재
- [ ] 위기 키워드 기록이 매칭에서 제외됨
- [ ] 금지 표현이 매칭 이유에 나타나지 않음
- [ ] 임베딩 없이도 Phase A 매칭이 동작
- [ ] 기존 89개 테스트 + 신규 테스트 모두 통과
- [ ] `bun run build` 성공

### 선택 통과 (출시 후)

- [ ] Phase B 임베딩 매칭 동작
- [ ] Phase C LLM 설명 생성
- [ ] 평가 세트 50개 통과
- [ ] HTML/CSS 폴백 동작
- [ ] Gutendex 500권 수집 스크립트 동작
