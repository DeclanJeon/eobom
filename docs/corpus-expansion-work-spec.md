# 이야기 거울 코퍼스 확장 작업지시서

> 기반: `docs/corpus-expansion-design.md`
> 작성일: 2026-07-31

---

## 1. 목적

이야기 거울의 FTS5 검색 코퍼스를 확장하고, 각 조각의 excerpt를 "입체 서사"(겉→안→겹침→응축) 생성이 가능하도록 충분히 보강하여, 사용자 회고와 더 다양하고 깊은 이야기를 연결한다.

## 2. 제약조건

- 기존 `StoryWork` / `StoryChunk` 스키마 유지 (Prisma)
- `StoryWork`: id, title, titleOriginal, author, era, locale, rightsStatus, sourceUrl 등
- `StoryChunk`: id, workId, text, title, themes/emotions/situations(JSON), excerpt, summary, locator, rightsStatus, language, corpusVersion
- `rightsStatus`: "approved" (승인된 것만 검색됨)
- `corpusVersion`: 새 코퍼스는 `v4.3-corpus-expand`로 통일
- `language`: "ko" (한국어)
- excerpt 길이: 150~350자 (4층 구조: 사건→감정→전환→응축)
- 메타데이터: themes, emotions, situations JSON 배열 필수
- 기존 데이터 보존 (삭제/덮어쓰기 금지)

## 3. 스토리 구현

### G001 Phase 1: 성경 인물 30명 + excerpt 심화

**목표**: 기존 10명 → 40명 이상으로 확장. 각 인물마다 excerpt 150~350자 (4층 구조), themes/emotions/situations 태그 포함.

**작업 범위**:
1. 스크립트(`scripts/story-mirror/ingest-biblical-characters.ts`) 작성
   - StoryWork (성경 인물 작품) + StoryChunk (인물별 excerpt) 생성
   - 기존 workId 중복 체크 후 신규만 삽입
2. 반드시 포함할 인물 10명:
   요셉·엘리야·욥·예레미야·룻·한나·바울·도마·막달라 마리아·아브라함
3. 추가 인물 20명:
   야곱·모세·여호수아·기드온·사무엘·에스더·느헤미야·마리아·요셉(남편)·세례요한·디모데·누가·스데반·빌립·삭개오·니고데모·선한 사마리아인·탕자의 아버지·엠마오 제자·기드온
4. 각 excerpt는 4층 구조:
   ```
   [사건] 무슨 일이 있었는가
   [감정] 그때 내면
   [전환] 무엇이 바뀌었는가
   [응축] 한 줄 통찰
   ```
5. themes/emotions/situations에 해당 인물의 감정 키워드 포함
6. `buildManifest` → `ingestChunks` 파이프라인으로 FTS5 인덱스 갱신

**검증 기준**:
- `StoryWork` 테이블에 성경 인물 40개 이상 존재
- `StoryChunk`에 한국어 승인 excerpt 40개 이상 (신규만)
- excerpt 길이 150~350자
- `bun run build` 통과
- `bun test` 기존 테스트 깨지 않음

### G002 Phase 2: 한국 전래동화/민담 40편

**목표**: 한국 사용자에게 가장 친숙한 서사 40편 추가.

**작업 범위**:
1. 스크립트(`scripts/story-mirror/ingest-korean-folktales.ts`) 작성
2. 포함 대상:
   - 전래동화 20개: 흥부와 놀부, 심청전, 춘향전, 홍길동전, 견우와 직녀, 해와 달이 된 오누이, 선녀와 나무꾼, 토끼전, 별주부전, 콩쥐팥쥐, 바리데기, 단군신화, 주몽신화, 온달과 평강공주
   - 민담 20개: 도깨비 이야기, 호랑이와 곶감, 은혜 갚은 까치, 여우 누이, 금도끼 은도끼, 나무꾼 이야기, 지혜로운 농부, 효자 설화
3. 각 편 excerpt: 150~350자 (4층 구조)
4. themes/emotions: "외로움", "가족", "책임", "희생", "성장" 등

**검증 기준**:
- `StoryWork`에 한국 전래동화 40개 이상 신규 추가
- excerpt 150~350자
- 빌드/테스트 통과

### G003 Phase 3: 중국 설화 20~30편

**작업 범위**:
1. 스크립트(`scripts/story-mirror/ingest-chinese-tales.ts`) 작성
2. 포함: 삼국지, 수호전, 서유기, 맹모삼천, 우공이산, 새옹지마, 백아절현, 와신상담, 백사전, 목란, 장자 호접몽, 정위전해, 과보추일
3. excerpt 150~350자, themes/emotions 포함
4. "후회", "인내", "우정", "상실" 키워드 우선 매칭

### G004 Phase 4: 서양 고전 보강

**작업 범위**:
1. 기존 편중 완화: 그리스 신화, 이솝우화, 셰익스피어, 독일·북유럽·이탈리아·영미권
2. 포함: 오르페우스, 프로메테우스, 이카루스, 리어왕, 맥베스, 템페스트, 파우스트, 베오울프, 신곡, 로빈슨 크루소, 모비딕
3. excerpt 150~350자

### G005 Phase 5: 관계형 연결

**목표**: 공통 태그로 조각 간 크로스링크.

**작업 범위**:
1. themes/emotions/situations 메타데이터를 기반으로 `StoryChunk.metadata`(JSON)에 `relatedChunkIds` 추가
2. 스크립트: 기존 청크의 themes/emotions가 겹치는 조각을 자동으로 연결
3. 이야기 상세 페이지에서 "함께 읽을 이야기"로 표시

---

## 4. 구현 공통

### 데이터 구조

```
StoryWork
  id, title, titleOriginal?, author?, era, locale, rightsStatus, sourceUrl
  → StoryChunk[] (1~3개 per work)

StoryChunk
  id, workId, text (본문), title, excerpt (150~350자), summary
  themes (JSON: ["외로움","책임"]), emotions (JSON: ["기도","감사"]), situations (JSON)
  locator, rightsStatus: "approved", language: "ko", corpusVersion
```

### excerpt 4층 구조 (각 청크)

```
1. 사건: 어떤 일이 있었는가 (구체적 장면 묘사)
2. 감정: 그때 내면에 있던 것 (두려움/외로움/열망 등)
3. 전환: 무엇이 바뀌었는가 (변화의 씨앗)
4. 응축: 한 줄 통찰 (연결 가능하게)
```

### 품질 게이트

- excerpt 길이 150~350자
- themes/emotions/situations 각 최소 1개 이상
- rightsStatus: "approved"
- corpusVersion: `v4.3-corpus-expand`
- 기존 데이터 삭제/덮어쓰기 없음
- `bun run build` / `bun test` 통과
- `scripts/story-mirror/ingest-chunks.ts` 실행 후 FTS5 인덱스 갱신

### 파일 참조

- 설계 문서: `docs/corpus-expansion-design.md`
- 기존 ingest 스크립트: `scripts/story-mirror/ingest-chunks.ts`
- DB 스키마: `prisma/schema.prisma` (StoryWork, StoryChunk)
- RAG 검색: `src/lib/story-mirror/rag-search.ts`
- 코퍼스 버전: `src/lib/story-mirror/rag-search.ts` → `RAG_CORPUS_VERSION`
