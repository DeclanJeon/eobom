# 이야기 거울 RAG v4.2 — 잔여 작업 실행 계획

## 목적
v4.2 핵심 파이프라인(FTS5 검색 → MiMo 스트리밍 → 저장 → /story-mirror/reflect)은 이미 구현·배포 완료.
이 계획은 **사용자 체감상 미완성**인 항목을 마무리한다. 상위 설계: `docs/design/story-mirror-rag-v4-remaining.md`.

## 원칙
- 외부 임베딩/벡터 DB 없음(FTS5 unicode61), MiMo는 chat/completions 스트리밍만, 권리/언어/코퍼스 필터 유지.
- 기존 카드 매칭(`StoryMirrorRun/Match`)은 보존. RAG는 카드 비종속 `StoryRagRun/Match` 사용.
- 점수/랭킹 금지, 온화한 동행자 톤 유지.

## 작업 (우선순위순)
1. [P1-1] RAG 실행 이력 저장·재조회 — `GET /api/story-mirror/rag/runs`(목록) + `/[id]`(상세) 추가, reflect 페이지 마운트 시 과거 run 렌더 + "지난 연결" 목록. 새로고침해도 결과 유지.
2. [P1-2] 메인 페이지/홈 카드에 RAG 연결 노출 — `getLatestRagRun()` util + 메인 페이지 "최근 거울 연결" 카드, 홈 카드 링크. 구 카드 매칭 영역은 유지.
3. [P2-1] RAG 연결 피드백 경로 — `StoryMirrorFeedback`에 `storyRagMatchId` 추가 + `POST /api/story-mirror/rag/runs/[id]/feedback`, 연결 카드에 좋아요/신고 버튼.
4. [P2-2] `StoryRagEvidence` 엔트리 근거 연결 — 엔트리 선택 UI 전제(후순위, 별도).

## 제약 (Defer — 지금 하지 않아도 됨)
- [P3-1] `rag-policy.ts` 안전 모듈 분리 (호출 지점 1곳이라 인라인 유지 가능)
- [P3-2] 버전 불일치 비활성화 게이트 + 코퍼스 매니페스트 (단일 코퍼스 고정)
- [P3-3] `StoryRagRun.expiresAt` + 정리 작업 (데이터량 작음)
- [P3-4] 실제 MiMo 네트워크 E2E (모의로 검증됨, 운영 스모크로 대체)
- [P3-5] Gutendex 500권 코퍼스 수집 (별개 이니셔티브, v4.2는 시드 46청크로 동작)

## 수용 기준
- tsc 0 에러, test:unit 전체 통과, next build 성공.
- 신규 API 단위 테스트: 권한 경계(401/404) + 정상 조회.
- 운영 배포 후 헬스 확인(/story-mirror/reflect 307, API 401).
- 실제 로그인 세션 브라우저 시각 확인은 자동화 불가 영역.
