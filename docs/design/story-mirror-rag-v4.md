# 이야기 거울 RAG 설계 문서 v4.2

- 작성: 2026-07-29
- 상태: MiMo-only 생성·로컬 검색·SSE 스트리밍 설계안
- 선행: story-mirror-v1.md (v1.2), heartfeed 프로젝트
- 검토 기준: 현재 Prisma 스키마, Story Mirror API, MiMo 호출부, 배포 의존성, MiMo 공식 API 문서

> v4.1의 BGE-M3/Qdrant 의존을 제거했다. MiMo API는 임베딩 엔드포인트로 사용하지 않고, SQLite 로컬 검색과 MiMo 스트리밍 생성을 결합한다.

---

## 0. 목적

사용자의 묵상 기록과 500권 고전 텍스트를 RAG 파이프라인으로 연결하여,
사용자의 주제·감정과 관련된 이야기를 검색·추천한다.

> "나와 비슷한 경험을 한 고전 속 인물·장면을 찾아줘"

### 0.1 구현 대조 결과

| 확인 항목 | 현재 상태 | 설계상 조치 |
|-----------|-----------|-------------|
| Gutendex 416개 | 메타데이터/다운로드 URL 후보 | 본문 수집·권리 검토·청크 인덱싱을 별도 완료 조건으로 둔다 |
| StoryCard | 28개 카드와 Phase A 매칭 | 본문 RAG에서는 선택 기능으로 분리한다 |
| 임베딩 | 카드용 OpenAI 또는 deterministic fallback | 본문 RAG에서는 원격 임베딩을 사용하지 않는다. SQLite FTS5(unicode61)와 결정적 query normalization을 사용한다 |
| 검색 저장소 | `package.json`에 sqlite-vec/Qdrant 없음 | SQLite 원장 + FTS5를 production 기본 경로로 사용한다 |
| MiMo | `chat/completions` 생성 호출 | 임베딩이 아니라 후보 선택·이야기 연결 생성과 스트리밍만 담당한다 |
| 시각화 | 네 종류를 동기 codex-imagen으로 생성 | 사용자 기록 기반 `summary` 한 종류와 비동기 작업으로 전환한다 |
| 결과 저장 | 기존 run이 `StoryCard`에 종속, consent snapshot 고정값 | 카드 비종속 `StoryRagRun/Match`와 실제 동의 snapshot을 추가한다 |

---

## 1. 설계 원칙

| 원칙 | 설명 |
|------|------|
| **본문 RAG 우선** | 작품·판본·청크를 검색한다. 인물 카드 100개를 먼저 만들지 않는다. |
| **두 저장소의 역할 분리** | SQLite는 권리·출처·사용자 결과와 로컬 검색 인덱스를 함께 담당한다. |
| **MiMo 역할 제한** | MiMo는 `chat/completions`만 사용한다. 벡터를 생성하거나 전 코퍼스를 재처리하지 않는다. |
| **권리 게이트** | `approved`이고 허용된 저장·인용 범위를 만족하는 청크만 검색 결과와 MiMo 프롬프트에 넣는다. |
| **한국어 우선 검색** | FTS5(unicode61)·통제 어휘·동의어 사전으로 한국어/영어 표면형을 보완한다. 의미 일반화는 MiMo 1회 생성 호출에서만 수행한다. |
| **충분하지 않으면 말하지 않음** | 검색 근거가 약하거나 인용 검증에 실패하면 연결을 생성하지 않는다. |
| **비공개 기본** | 원문·검색 쿼리·RAG 결과는 사용자 본인만 볼 수 있다. 공유는 별도 선택과 출처 정책을 따른다. |
| **버전 재현성** | corpus, FTS tokenizer, 검색기, 프롬프트, 정책 버전을 모두 결과에 기록한다. |
| **스트리밍 우선** | 로컬 검색 결과를 먼저 확보한 뒤 MiMo `stream=true` 응답을 SSE로 전달한다. 스트리밍은 지연 체감 개선이며 검색 근거를 대체하지 않는다. |

---

## 2. 아키텍처

### 2.1 오프라인 인덱싱

```text
원문/메타데이터 후보
  → rights manifest 검토
  → 승인된 작품·판본만 수집
  → UTF-8 정규화 + checksum
  → 장·절·문단/장면 단위 청킹
  → source/work/edition/locator 메타데이터 부착
  → SQLite StoryChunk 원장 + FTS5 trigram index
  → 통제 주제어·감정어·작품명·저자명 보조 인덱스
  → corpus manifest 고정
```

본문 수집·청킹·FTS5 생성은 모두 로컬 작업이다. MiMo API를 사용해 청크별 요약이나 벡터를 미리 생성하지 않는다.

### 2.2 온라인 연결

```text
사용자 기록 선택
  → feature flag·외부 처리 동의 확인
  → 위기/민감정보 검사 및 최소화
  → 로컬에서 태그·감정·성구·허용 본문을 query terms로 정규화
  → SQLite FTS5 BM25/trigram top-30
  → 작품/문화권/언어 다양성 필터 + rights/evidence gate
  → MiMo에 최대 6개 후보만 전달
  → MiMo chat/completions stream=true
  → SSE delta 전송
  → 종료 후 Zod schema·citation ID 검증
  → SQLite에 private run/match/evidence 저장
```

검색은 MiMo 응답을 기다리지 않는다. MiMo는 후보가 준비된 뒤 한 번만 호출한다.


### 2.3 저장소 선택

`StoryChunk` 본문 RAG의 production 기본 검색기는 SQLite FTS5다. `sqlite-vec`, Qdrant, BGE-M3 worker는 필수 의존성이 아니다.

- **현재 카드 단계**: 기존 `StoryCardEmbedding` JSON 전수 cosine scan은 호환 기능으로만 유지한다.
- **500권 본문 단계**: 승인된 청크를 SQLite 원장과 FTS5(unicode61) 인덱스에 저장한다.
- **한국어 검색 보완**: 제목·저자·주제·감정·성구는 정규화된 별도 term 필드에 넣고, 본문은 unicode61 토크나이저로 음절 블록 단위 정확 매칭한다. (구현 결정: trigram은 3음절 미만 쿼리에서 실패하므로, 2음절 한국어 주제어·인물명 검색을 위해 unicode61을 선택했다. 단어 내 부분일치는 지원하지 않으나 동의어 사전·정규화로 보완한다.)
- 검색 결과가 부족하면 `insufficientEvidence`로 종료한다. 검색되지 않은 이야기를 MiMo에게 추론시키지 않는다.
- MiMo API 호출은 최종 연결 생성 1회로 제한하며, API 비용은 임베딩 비용과 별개로 발생한다.

### 2.4 배포 경계

```text
Next.js eobom
  ├─ SQLite/Prisma: 원장·권리·FTS5·private 결과
  └─ MiMo API: 후보 3-6개 기반 스트리밍 생성
```

- MiMo API key와 사용자 원문은 서버에서만 취급한다.
- Next.js는 FTS5 결과의 `chunkId`를 SQLite에서 재조회해 권리·출처를 검증한다.
- deploy는 DB migration → approved corpus sync → FTS5 integrity/count/version 확인 → API smoke test 순서다.
- `corpusVersion`, `retrieverVersion`, `promptVersion`, `policyVersion`이 다르면 RAG를 비활성화한다.

---

## 3. 데이터 모델과 코퍼스 단위

### 3.1 작품·판본·청크를 분리한다

기존 스키마에는 `StoryWork`, `StoryEdition`, `StoryPassage`, `StoryCard`, `StoryCardEmbedding`이 있다. `StoryCard`는 카드 카탈로그와 기존 Phase A 매칭을 위한 선택적 기능이다. 본문 RAG는 카드 생성 없이 작품의 장면을 검색해야 하므로 카드에 종속되지 않는 청크 모델이 필요하다.

```prisma
model StoryChunk {
  id              String   @id @default(cuid())
  workId          String
  editionId       String?
  chunkIndex      Int
  locator         String?  // chapter, section, verse, paragraph anchor
  title           String?
  text            String?  // allow_storage가 true인 경우에만
  excerpt         String?  // citationAllowed 범위의 짧은 인용
  summary         String?  // 원문 저장 불가 소스의 검수된 요약
  language        String
  themes          String   @default("[]")
  contentWarnings String   @default("[]")
  rightsStatus    String
  citationAllowed Boolean  @default(false)
  sourceUrl       String
  checksum        String?
  corpusVersion   String
  createdAt       DateTime @default(now())

  work             StoryWork            @relation(fields: [workId], references: [id], onDelete: Cascade)
  edition          StoryEdition?       @relation(fields: [editionId], references: [id], onDelete: SetNull)
  ragMatches       StoryRagMatch[]

  @@index([workId])
  @@index([editionId])
  @@index([rightsStatus, corpusVersion])
}
```

`StoryChunk`은 원문·허용 인용·검수 요약·검색용 term을 보유한다. 임베딩 전용 Prisma 모델은 만들지 않는다.

실제 migration에서는 `StoryWork.chunks` 역방향 relation과 `StoryEdition.chunks`를 추가한다. FTS5 virtual table은 `text`, `excerpt`, `summary`, `title`, `themes`, `contentTerms`를 색인하고 insert/update/delete 트리거 또는 전체 재생성 절차를 manifest에 둔다.

### 3.2 FTS5 메타데이터

```text
chunkId, workId, editionId, language, culture,
rightsStatus, citationAllowed, corpusVersion, locator
```

검색은 `rightsStatus=approved`, 현재 `corpusVersion`, 허용 언어를 SQL 조건으로 먼저 제한한 뒤 FTS5 BM25/trigram 순위를 계산한다. 검색 결과는 항상 SQLite 원장에서 재조회한다.

### 3.3 기존 카드와의 관계

- `StoryCard` 생성은 본문 RAG의 선행 작업이 아니다.
- 기존 `/api/story-mirror/runs`의 카드 매칭은 호환성을 위해 유지하되, RAG 연결은 별도 `StoryChunk` evidence를 사용한다.
- 장기적으로 `StoryMirrorMatch.cardId`를 nullable로 확장하고 `chunkId` 또는 별도 `StoryRagMatch`를 추가해야 한다. v4.0처럼 카드에만 매칭을 저장하면 카드 없는 500권 검색 결과를 저장할 수 없다.
- `StoryPassage`는 기존 카드의 출처로 유지하고, 본문 RAG 청크와 의미를 혼동하지 않는다.

### 3.4 RAG 결과 저장 모델

카드 없는 RAG 결과를 기존 `StoryMirrorMatch`에 억지로 넣지 않는다. 다음 모델을 추가하거나 동일 필드를 가진 별도 저장 계층을 만든다.

```prisma
model StoryRagRun {
  id                    String   @id @default(cuid())
  userId                String
  inputFingerprint      String
  corpusVersion         String
  retrieverVersion      String
  promptVersion         String
  policyVersion         String
  consentSnapshot       Boolean
  status                String   @default("pending") // pending|running|streaming|complete|failed|expired
  failureCode           String?
  createdAt              DateTime @default(now())
  completedAt            DateTime?
  expiresAt              DateTime?

  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  matches StoryRagMatch[]

  @@unique([userId, inputFingerprint, corpusVersion, retrieverVersion, promptVersion, policyVersion])
}

model StoryRagMatch {
  id                  String   @id @default(cuid())
  runId               String
  chunkId             String
  searchScore         Float
  confidence          String
  connection          String?
  differentPerspective String?
  state               String   @default("active")
  createdAt           DateTime @default(now())

  run    StoryRagRun @relation(fields: [runId], references: [id], onDelete: Cascade)
  chunk  StoryChunk  @relation(fields: [chunkId], references: [id], onDelete: Cascade)
  evidence StoryRagEvidence[]

  @@index([runId])
  @@index([chunkId])
}

model StoryRagEvidence {
  id        String   @id @default(cuid())
  matchId   String
  entryId   String
  role      String   // supporting|counter|context
  createdAt DateTime @default(now())

  match StoryRagMatch   @relation(fields: [matchId], references: [id], onDelete: Cascade)
  entry ReflectionEntry @relation(fields: [entryId], references: [id], onDelete: Cascade)

  @@index([matchId])
  @@index([entryId])
}
```

`User.storyRagRuns`와 `ReflectionEntry.storyRagEvidence` 역방향 relation을 추가한다. `chunkId`는 검색 후보에서 선택된 것만 저장하며, `connection` 생성 실패도 검색 결과와 실패 상태를 보존할 수 있게 nullable로 둔다.

### 3.5 SQLite 확장에 대한 제한

```sql
-- FTS5는 앱 DB migration의 raw SQL 단계에서 생성한다.
CREATE VIRTUAL TABLE fts_story_chunks USING fts5(
  chunk_id UNINDEXED, text, excerpt, summary, title, themes
);
```

FTS5의 tokenizer, query normalization, corpusVersion, retrieverVersion을 manifest와 결과에 기록한다. 벡터 차원·거리 함수·임베딩 모델은 이 설계의 계약에 포함하지 않는다.

---

## 4. 텍스트 수집·청킹

### 4.1 현재 데이터 상태와 production 게이트

현재 `data/story-mirror/gutenberg-candidates.json`과 `gutenberg-normalized.json`은 Gutendex의 서지 메타데이터와 다운로드 URL 목록이다. 이 파일만으로는 검색 가능한 416권의 본문이 존재하지 않는다. 따라서 “416권 수집 완료”와 “RAG 코퍼스 416권 인덱싱 완료”를 구분한다.

| 상태 | 의미 | production 검색 |
|------|------|------------------|
| `candidate` | 제목·저자·URL만 확인 | 불가 |
| `review` | 원문·판본·라이선스 검토 중 | 불가 |
| `approved` | KR 권리, 저장·요약·인용 범위 확인 | 가능 |
| `withdrawn` | 권리 철회·오류·삭제 요청 | 즉시 제외 |

| 소스 | 현재 확인 | 다음 조건 |
|------|-----------|-----------|
| Gutendex | 416개 메타데이터 후보 | 작품·판본별 KR 권리 검토 후 본문 수집 |
| 한국 고전 | 설계 후보 | 데이터셋별 저장·변환·AI 처리 조건 확인 |
| 성경 | 기존 28개 카드/링크 매니페스트 | 허가된 번역문만 저장, 아니면 주소·공식 링크만 |
| Standard Ebooks | 설계 후보 | 작품별 manifest와 KR 노출 조건 확인 |

동일 작품의 번역본은 임의로 “품질이 가장 높은 것”으로 선택하지 않는다. 권리·언어·번역자·검색 품질을 함께 평가해 edition을 고정한다.
### 4.2 청킹 전략

**문단 기반 청킹** (heartfeed의 `TimestampChunker`에서 영감):

```text
전체 텍스트
  → 문단 분리 (\n\n 기준)
  → 각 문단: 300-500자 유지
  → 300자 미만: 인접 문단과 합치기
  → 500자 초과: 문장 경계에서 분할
  → 문장·장면 경계에서 10-20% 오버랩 (작품별 검증)
```

예시:
```text
Chunk 1: "다윗은 골리앗과의 싸움에서..." (350자)
Chunk 2: "골리앗과의 싸움에서 다윗이 승리한 후..." (380자) [10-20% 오버랩]
Chunk 3: "다윗이 왕이 된 후 그의 치세는..." (310자)
```

**성경 텍스트 특별 처리**:
- 장/절 단위로 청킹
- 각 청크는 "창세기 1:1-5"처럼 성구 참조 포함
- 문맥을 위해 앞뒤 1-2절 포함
- 허용된 번역문이 없으면 본문 대신 성구 주소·공식 링크만 보존

### 4.3 인덱싱 스크립트 구조

```text
scripts/story-mirror/
  01-fetch-gutendex.ts       # ✅ 메타데이터 후보 수집
  05-normalize-source.ts     # ✅ 후보 정규화
  07-validate-rights.ts      # ✅ 권리 게이트
  02-fetch-approved-texts.ts # 승인된 판본만 원문 수집
  10-chunk-texts.ts          # 신규: 작품·판본 → StoryChunk
  12-build-fts-index.ts      # 신규: FTS5 trigram 생성/검증
  14-validate-corpus.ts      # 신규: checksum·권리·개수·FTS integrity 검증
```

각 단계는 `corpusVersion`, 입력 checksum, 처리 시각, 실패 항목을 남기며 재실행 시 이미 성공한 항목을 건너뛴다.

---

## 5. 임베딩을 사용하지 않는 검색 계약

### 5.1 결정

MiMo 공식 API와 현재 코드 계약은 `POST /v1/chat/completions`이다. 임베딩 전용 endpoint를 사용하지 않는다. MiMo chat으로 숫자 벡터를 흉내 내거나 청크마다 의미 요약을 미리 생성하지 않는다.

- 본문과 query는 SQLite FTS5 trigram/BM25로 검색한다.
- 제목·저자·작품·주제·감정·성구는 로컬 통제 어휘와 정규화 term으로 보강한다.
- MiMo는 검색 후보 3-6개를 근거로 연결 설명을 생성한다.
- 임베딩 비용은 발생하지 않지만 MiMo API의 chat token 비용은 발생한다.
- hosted MiMo API 자체가 무료라는 뜻은 아니다. 공식 플랫폼의 token plan·모델별 과금 정책을 따르며, 완전 무비용이 필요하면 API 호출도 할 수 없다.

### 5.2 로컬 인덱싱 계약

```text
approved StoryChunk batch
  → title/author/themes/emotions/locator 정규화
  → SQLite FTS5 trigram virtual table upsert
  → rightsStatus·citationAllowed·corpusVersion 검증
  → FTS5 integrity/count/manifest 검증
```

코퍼스 변경, 권리 철회, 청크 checksum 변경은 새 `corpusVersion`을 만든다. 인덱싱은 로컬 배치 작업이며 API 요청 경로에서 실행하지 않는다.

---
## 6. 검색·스트리밍 파이프라인

### 6.1 검색

```text
query:
  Q1 = ReflectionEntry.tags + emotions + scriptureRefs
  Q2 = 통제 어휘·동의어·2-3gram으로 확장한 로컬 query

1. SQL 권리·corpusVersion 조건으로 검색 범위 제한
2. SQLite FTS5 BM25/trigram top-30
3. 같은 work는 최대 1개, 다양한 culture/language를 우선
4. rights/citation/safety/evidence gate
5. 최종 3-6개만 MiMo context로 전달
```

검색 후보가 없거나 근거가 약하면 MiMo를 호출하지 않고 `insufficientEvidence`를 반환한다.

```typescript
type RetrievedChunk = {
  chunkId: string;
  workId: string;
  title: string;
  locator: string | null;
  excerpt: string | null;
  sourceUrl: string;
  rightsStatus: "approved";
  citationAllowed: boolean;
  searchScore: number;
};
```

### 6.2 SSE 스트리밍

스트리밍은 검색을 병렬화하는 알고리즘이 아니다. 검색 근거를 먼저 고정한 다음 MiMo 생성 결과를 즉시 전달하는 전송 방식이다.

```text
POST /api/story-mirror/runs/stream
  → run 생성(status=running)
  → 로컬 FTS 검색
  → event: retrieval { runId, matches[] }
  → MiMo POST /v1/chat/completions { stream: true }
  → event: delta { text }
  → [DONE]
  → 전체 응답 JSON parse + Zod/citation 검증
  → event: complete { result }
```

SSE event 계약:

```typescript
type StoryMirrorStreamEvent =
  | { type: "retrieval"; runId: string; matches: RetrievedChunk[] }
  | { type: "delta"; text: string }
  | { type: "complete"; result: StoryRagResult }
  | { type: "insufficientEvidence"; reason: string }
  | { type: "error"; code: string };
```

- 클라이언트는 `retrieval`을 먼저 화면에 표시하고, `delta`를 임시 이야기 초안으로 표시한다.
- `complete` 전에는 초안을 확정 결과·공유 데이터로 저장하지 않는다.
- MiMo가 JSON을 생성하더라도 서버는 모든 delta를 누적한 뒤 최종 JSON을 검증한다.
- 연결 timeout·schema 실패 시 검색 결과와 출처만 표시하고 자동 설명을 확정하지 않는다.
- `AbortController`, 사용자별 동시 실행 1개, heartbeat, 총 timeout을 둔다.

### 6.3 입력 최소화

기본 query는 기존 `ReflectionEntry.tags`, `emotions`, `scriptureRefs`를 정규화한다. 본문은 `storyMirrorExternalConsent`가 있고 안전 검사를 통과한 경우에만 짧게 포함한다. `privateNote`, 첨부파일, 이름·이메일·정확한 장소·제3자 식별자는 제외한다.

쿼리에는 `entryIds`와 기간을 저장하되 원문을 fingerprint에 넣지 않는다. 결과 evidence는 실제 사용된 entry ID와 청크 ID를 FK로 기록한다.

---


## 7. 이야기 연결 생성

### 7.1 MiMo 프롬프트

```
당신은 사용자의 묵상 기록과 고전 텍스트를 연결하는 이야기 도우미입니다.

사용자의 기록:
{entries}

검색된 관련 고전 장면:
{search_results}

위 정보를 바탕으로, 검색된 근거 안에서 사용자의 기록과 가장 잘 연결되는 장면을 2~3개 고르고,
각 장면이 사용자의 상황과 어떻게 닮았는지 1-2문장으로 설명하세요.
 

규칙:
- 각 연결은 `chunkId`를 정확히 하나 이상 참조하고, 후보에 없는 작품·locator·인용을 만들지 않습니다.
- `citationAllowed=false`인 원문은 인용하지 않고 작품명·출처 링크·요약만 사용합니다.
- 차이와 한계를 반드시 언급합니다. 사용자를 인물·성격·운명으로 분류하지 않습니다.
- 하나님의 뜻, 죄, 소명, 신앙 상태, 의료·법률·정신건강 결론을 말하지 않습니다.
- 위기·자해·타해·학대 신호가 있으면 연결 생성 대신 안전 경로를 사용합니다.
- 결과가 약하면 빈 연결과 `insufficientEvidence` 이유를 반환합니다.
```

### 7.2 응답 구조

```typescript
type StoryRagResult = {
  connections: Array<{
    chunkId: string;
    workTitle: string;
    author?: string | null;
    locator?: string | null;
    sourceUrl: string;
    excerpt?: string | null;
    connection: string;
    differentPerspective: string;
  }>;
  insufficientEvidence: boolean;
  limitations: string;
  disclaimer: string;
};
```

생성 뒤 Zod로 구조를 검증하고, `chunkId`·`workTitle`·`locator`·`sourceUrl`는 검색 후보와 대조한다. 실패하면 저장된 검색 결과만 `설명 준비 안 됨`으로 표시하고 fallback 문구를 사용한다. 사용자 원문과 source text는 서로 다른 delimiter로 감싸 prompt injection을 데이터로 취급한다.

---

## 8. 성능·비용과 운영 한계

v4.0의 `$5`, `$0.05`, `100ms`, `10~20초`는 모델·청크 수·서버·네트워크가 확정되지 않아 근거 없는 수치다. 구현 전에 benchmark를 측정하고 manifest와 운영 대시보드에 기록한다.

측정 항목:

- offline: 승인 작품 수, 청크 수, 평균/최대 청크 길이, FTS index 크기·무결성
- retrieval: FTS p50/p95, 후보 수, `insufficientEvidence` 비율, 첫 검색 결과 시간
- quality: `precision@3`, `recall@k`, `unrelated rate`, `citation accuracy`, `overclaim rate`, `abstain precision`
- generation: MiMo 성공률, first-token latency, stream 완료율, schema 실패율, timeout, token 수, 사용자별 호출량

비용은 MiMo provider의 실제 token 청구로 측정한다. 임베딩 provider와 BGE-M3 worker 비용은 없다. RAG 요청은 사용자별 rate limit, 연결 timeout, 최대 입력 토큰, 최대 후보 수를 둔다.

### 8.1 실패 상태

```text
index missing/degraded → 결정적 카드 매칭 또는 `insufficientEvidence`
MiMo connection/stream timeout → 검색 결과 + 출처만 표시
MiMo schema/citation failure → 검색 결과 + 출처만 표시
rights withdrawal → 해당 chunk·cache 즉시 비활성화
user entry deletion → evidence와 private run cascade/삭제
```

---

## 9. 구현 단계

### Phase 0: 계약·권리·평가 고정

| 작업 | 산출물 |
|------|--------|
| `StoryChunk` migration 결정 | schema + rollback 절차 |
| 416개 후보를 approved와 분리 | `sources.manifest.json` 갱신 |
| FTS5 tokenizer/query benchmark | 한국어·영어 검색 p50/p95와 quality baseline |
| 검색·생성 평가셋 확장 | `story-mirror-evaluation.json` + RAG gold set |

### Phase 1: 승인 코퍼스 수집·청킹

| 작업 | 산출물 |
|------|--------|
| approved 판본만 다운로드 | 원문 checksum + 실패 목록 |
| 문단·장면·절 청킹 | `StoryChunk` rows |
| FTS5 생성·검증 | FTS index + rebuild command |

### Phase 2: 로컬 검색 인덱스

| 작업 | 산출물 |
|------|--------|
| FTS5 trigram/BM25 생성 | versioned FTS index |
| query normalization·통제 어휘 | `story-mirror-query-terms.json` |
| 재생성·철회·부분실패 처리 | idempotent build script |

### Phase 3: 검색·이야기 연결

| 작업 | 산출물 |
|------|--------|
| FTS5 retrieval + diversity | `src/lib/story-mirror/rag-search.ts` |
| safety/privacy/evidence gate | `src/lib/story-mirror/rag-policy.ts` |
| MiMo structured SSE generation | `src/lib/story-mirror/rag-generation.ts` |
| 카드 비종속 private result 저장 | `StoryRagRun/Match` 또는 nullable migration |
| `POST /stream` + SSE smoke test | `/api/story-mirror/rag/runs/stream` |

### Phase 4: 한 장 시각화

| 작업 | 산출물 |
|------|--------|
| 로컬에서 날짜·주제·감정 집계 | `visualize-data.ts` 기반 summary JSON |
| 한 종류의 summary 이미지 | `kind=summary` 및 period fingerprint |
| 비동기 codex-imagen 작업 | pending/generating/complete/failed 상태 |

summary JSON은 원문이 아닌 다음 제한된 집계만 포함한다.

```typescript
type PersonalSummaryData = {
  periodStart: string;
  periodEnd: string;
  entryCount: number;
  themeFrequency: Array<{ label: string; count: number }>;
  emotionTrend: Array<{ date: string; values: Record<string, number> }>;
  recurringScriptures: string[];
  openQuestionsCount: number;
};
```

이미지는 정확한 그래프·문자 정보를 보장하지 않는 감성 요약물이다. 동일 데이터를 접근 가능한 텍스트 요약으로 함께 제공하고, 이미지 prompt에는 원문·식별정보를 넣지 않는다. 현재 `image-gen.ts`의 `dataSummary` 미사용과 네 종류 prompt는 이 계약에 맞게 수정한다.

### Phase 5: 공유·운영

| 작업 | 산출물 |
|------|--------|
| private 기본·선택 공유 | 공개 DTO와 원문/인용 분리 |
| rights withdrawal/delete worker | index/cache/evidence 정리 |
| latency·quality·cost telemetry | 원문 없는 운영 지표 |

---

## 10. 성경 추천과 RAG의 경계

RAG가 검색한 고전 장면과 “다음에 읽을 성구”는 같은 기능이 아니다.

- `rereadScriptures`는 기존 기록에 등장한 성구를 다시 읽도록 안내한다.
- 새로운 성구 추천은 승인된 성구 catalog와 검증된 reference만 사용한다.
- catalog가 없으면 모델이 임의의 성구 주소를 만들지 않고, 기록에 실제 등장한 성구만 반환한다.
- 추천 이유는 처방·신앙 판정이 아니라 기록의 주제와 본문을 다시 읽을 초점으로 표현한다.

---

## 11. 개인정보·안전·권리 운영

- `storyMirrorEnabled`, `storyMirrorExternalConsent`, `storyMirrorLastConsentVersion`을 생성 전에 확인하고 `consentSnapshot`을 저장한다. 현재 `/api/story-mirror/runs`의 `consentSnapshot: false` 고정은 새 경로에서 수정해야 한다.
- `aiProcessingConsent`만으로 외부 처리 동의를 간주하지 않는다.
- `content-scrub`와 Story Mirror 전용 safety scan에서 위기·자해·타해·학대 신호를 차단한다.
- 사용자 원문은 로그·검색 인덱스·공개 catalog에 넣지 않는다. 삭제 시 run, match, evidence, cache를 함께 삭제/비활성화한다.
- 공개 공유는 사용자가 선택한 요약과 권리 허용 출처만 포함하고, 묵상 원문과 RAG prompt는 자동 공유하지 않는다.
- 작품·판본·번역·저자·라이선스·허용 행위·확인일·checksum을 manifest에 기록한다. `approved`가 아니면 저장·검색·생성 컨텍스트에서 제외한다.
- 폭력·성폭력·자해·노예제·차별 등은 `contentWarnings`와 역사적 맥락을 표시하고 낭만화하지 않는다.

---

## 12. API·UI 계약

모든 사용자 API는 `requireApiUser`, Zod validation, ownership check, rate limit를 적용한다.

```text
POST /api/story-mirror/rag/runs
  명시적 생성. entryIds/기간/consent 확인. 202 + runId 반환.

POST /api/story-mirror/rag/runs/stream
  명시적 생성. 로컬 검색 결과와 MiMo delta를 SSE로 전달한다.

GET /api/story-mirror/rag/runs/:id
  본인 소유 run만 조회. pending/running/streaming/complete/failed 반환.

POST /api/story-mirror/rag/matches/:id/feedback
  helpful | inaccurate | unrelated | sensitive | hide

POST /api/story-mirror/visualize
  kind=summary만 허용. 기간 집계와 이미지 작업을 분리.
```

생성 작업을 GET이나 동기 120초 SSH 호출로 처리하지 않는다. 같은 input/corpus/matcher/model/policy fingerprint는 idempotent하게 재사용한다. 점수는 내부 품질 진단용이며 UI에는 정답처럼 노출하지 않는다.

---

## 13. 수용 기준

- 현재 416개는 “메타데이터 후보”로 표시되고, approved 본문 청크 수가 별도로 검증된다.
- 모든 production 검색 결과가 `approved` work/edition/chunk와 출처 URL·locator로 재검증된다.
- FTS5 query normalization·corpusVersion·retrieverVersion이 일치한다.
- 로컬 FTS 검색 결과가 `approved` work/edition/chunk와 출처 URL·locator로 재검증된다.
- `retrieval` event가 `delta` event보다 먼저 전달된다.
- 검색 후보에 없는 citation ID, 작품, locator, 인용은 생성 응답에 남지 않는다.
- 충분한 근거가 없을 때 `insufficientEvidence`로 중단하며 hallucinated story를 만들지 않는다.
- 외부 처리 동의 없는 원문은 MiMo에 전달되지 않는다.
- 위기 테스트는 story 연결 대신 안전 경로를 선택한다.
- 시각화는 사용자 기록 집계만 입력으로 하는 `summary` 한 종류이며, 이미지 생성 실패 시 데이터 요약은 보존된다.
- 기존 테스트와 RAG 평가셋을 실행하고 `precision@3`, unrelated rate, citation accuracy, overclaim rate를 보고한다.
- 빌드·인덱스 health check·API smoke test가 모두 통과한다.

---

## 14. 참고 자료

### heartfeed에서 차용한 패턴

| heartfeed 모듈 | 이어봄 적용 |
|---------------|------------|
| `HybridRetriever`의 query 분석 | FTS5 BM25/trigram + 통제 어휘 query variants |
| `ContextBuilder` | 후보 3-6개를 provenance 보존 context로 구성 |
| `TimestampChunker` | 문단·장면·장/절 청킹 규칙으로 변환 |

### 외부 참고

- [SQLite FTS5](https://sqlite.org/fts5.html): 로컬 full-text search와 BM25 참고
- [SQLite FTS5 trigram tokenizer](https://sqlite.org/fts5.html#the_trigram_tokenizer): 한국어·부분 일치 검색 참고
- [MiMo API platform](https://mimo.mi.com/docs): `chat/completions`, 모델·요금·API 계약 확인

---

