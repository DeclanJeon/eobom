# 이야기 거울 RAG v4.2 구현

## 목표
설계 문서 `docs/design/story-mirror-rag-v4.md`(v4.2)를 바탕으로 **임베딩 없는 로컬 검색 + MiMo 스트리밍 생성** 경로를 구현한다. 기존 카드 기반 매칭(`StoryMirrorRun`/`StoryMirrorMatch`)은 호환 목적으로 유지한다.

## 설계 원칙 (요약)
- 외부 임베딩/벡터 DB(BGE-M3, Qdrant, sqlite-vec)를 사용하지 않는다. SQLite FTS5(trigram/BM25)를 production 검색기로 사용한다.
- MiMo는 `chat/completions` 스트리밍(`stream:true`)으로만 사용하며, 요청당 최대 1회 호출한다.
- 검색은 로컬에서 먼저 확보하고, 후보 3~6개만 MiMo 컨텍스트로 전달한다.
- 결과 저장은 카드 비종속 `StoryRagRun`/`StoryRagMatch`/`StoryRagEvidence`를 사용한다.
- 검색 후보가 없거나 근거가 약하면 MiMo를 호출하지 않고 `insufficientEvidence`를 반환한다.
- 동의 필드는 이미 존재: `User.storyMirrorEnabled` / `storyMirrorExternalConsent` / `storyMirrorLastConsentVersion`.

## 작업 목록
1. 스키마/마이그레이션: `StoryChunk`, `StoryRagRun`, `StoryRagMatch`, `StoryRagEvidence` 추가 + FTS5 virtual table(`StoryChunkFts`) 생성 절차. 기존 모델 호환 유지.
2. 코퍼스 수집/인덱싱: 기존 seed 소스(`world-classics`, `korean-classics`, `bible-characters`)에서 `StoryChunk` + FTS5 행을 생성하는 ingest 스크립트. `rightsStatus=approved`, `corpusVersion` 고정.
3. FTS5 검색 파이프라인: `src/lib/story-mirror/rag-search.ts` — 쿼리 정규화, FTS5 MATCH, 권리/언어/코퍼스 필터, 다양성, top 3~6.
4. MiMo 스트리밍 생성: `src/lib/story-mirror/rag-generation.ts` — `stream:true` SSE 파싱, 누적, Zod/citation 검증.
5. SSE 엔드포인트: `POST /api/story-mirror/rag/runs/stream` — 동의 확인 → FTS5 검색 → `retrieval` 이벤트 → MiMo `delta` 스트리밍 → `complete`/`insufficientEvidence`/`error`. 완료 시 `StoryRagRun/Match/Evidence` 저장.
6. 시각화 summary 단일화: `KINDS`를 `summary`만 허용하도록 정리(라우트/페이지/image-gen/visualize-data). 비동기 상태 유지.
7. 테스트/검증: `rag-search`(FTS5), 스트리밍 엔드포인트, 동의 경계 단위 테스트 + 전체 suite + 타입체크 + 빌드.

## 제약
- 기존 eobom 아키텍처 유지 (Next.js 16, Prisma + SQLite, Bun)
- 브랜드 톤 유지 (온화한 동행자, 점수·랭킹 금지)
- 기존 테스트 회귀 금지 (163개+)
- 외부 임베딩 API/비용 없음

## 수용 기준
- `prisma generate` + `db push` 성공, FTS5 virtual table 생성 절차 포함
- ingest 스크립트로 `approved` `StoryChunk` ≥ 30개 + FTS5 인덱싱 확인
- `rag-search`가 권리/언어/코퍼스 필터 후 `RetrievedChunk[]` top-N 반환, 단위 테스트 통과
- `/stream`이 `retrieval → delta → complete` 흐름을 내고, 후보 없음 시 `insufficientEvidence` 분기
- visualize가 `summary`만 허용
- 전체 테스트 통과 + 타입체크 + 프로덕션 빌드 통과
