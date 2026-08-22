# 변경 기록 (CHANGELOG)

이 파일은 CI가 main 푸시마다 자동으로 갱신합니다. 상세 개발노트는 `docs/dev-notes/`를 보세요.

## v1.11.4 — 2026-08-22

### 기타

- MiMo fallback timeout upper bound to proxy budget

## v1.11.3 — 2026-08-22

### 개선

- guide 인물 목록 형식 변형과 장 분할 보정

### 기타

- reference API bounds, parser QA, and deploy artifact guards

## v1.11.2 — 2026-08-22

### 기타

- 공개 주석을 장별 SQLite 조회로 전환

## v1.11.1 — 2026-08-22

### 기타

- 생성형 공개 주석 corpus를 gitignore 처리

## v1.11.0 — 2026-08-22

### 기타

- 공개 도메인 Matthew Henry 주석 수집·표시 연결

## v1.10.0 — 2026-08-22

### 기타

- 66권 장·인물 해설을 문맥 카드에 연결

## v1.9.0 — 2026-08-22

### 기능

- 공개 참조 조회 API에 IP rate-limit 추가
- LLM fallback chain에 맞춰 Nginx read timeout 확장
- MiMo 회고 응답 시간을 90초로 확장

### 개선

- 오늘 성구 카드 가독성·모바일 밀도 개선

### 기타

- 기록 상세의 기도·결단에 clay 토큰 적용
- 불용 dark-mode 스캐폴딩 제거
- remote 배포에서도 Nginx 설정을 reload
- MiMo reasoning과 회고 분류 JSON 계약을 정렬
- 클라이언트 참조 표기에서 서버 모듈 의존 제거
- 참조 데이터 파이프라인 자산을 커밋하고 참조 조회 API를 연다
- 참조 성구를 한국어 책이름으로 표기하고 배경 카드를 접어서 통일
- 성구 절별 가독성·장 배경·연결 성구 반영

## v1.8.1 — 2026-08-21

### 개선

- 오늘 성구 카드 가독성·모바일 밀도 개선

### 기타

- 성구 절별 가독성·장 배경·연결 성구 반영

## v1.8.0 — 2026-08-21

### 기타

- 성구 절별 가독성·장 배경·연결 성구 반영

## v1.7.0 — 2026-08-21

### 기능

- 위계 복원 — 보조 결단 1개와 최근 기록 목록, h1 추가
- design: Mirror Narrative와 계층 원칙을 DESIGN.md에 반영, clay·mist 토큰과 light-only 추가

### 기타

- 앱 구조를 /lookback 중심으로 갱신하고 오늘·작성기 표기 정합
- 회고 상세 기본 접힘과 clay/mist 적용
- 작성기 기본값을 비공개로 전환하고 고지 카피 정합

## v1.6.0 — 2026-08-21

### 기능

- 위계 복원 — 보조 결단 1개와 최근 기록 목록, h1 추가
- design: Mirror Narrative와 계층 원칙을 DESIGN.md에 반영, clay·mist 토큰과 light-only 추가

### 개선

- Make quick records private and traceable

### 기타

- 회고 상세 기본 접힘과 clay/mist 적용
- 작성기 기본값을 비공개로 전환하고 고지 카피 정합
- Keep first screens focused on one received card
- Simplify the receive-first home surface
- Install dependencies in remote deploys
- Release operational hardening
- Harden operational observability
- Release the Receive-first redesign
- Open safe email and retreat operations
- Turn keyring visits into a receive-first loop
- 보고서: 100% 배포 완료 보고서(커밋·푸시·배포·DB 무손실)를 보관한다

## v1.5.5 — 2026-08-21

### 기타

- Keep first screens focused on one received card

## v1.5.4 — 2026-08-21

### 개선

- `/j`와 `/today`의 첫 화면을 TodayCard 하나 중심으로 단순화한다.
- 최근 기록·결단·회고는 삭제하지 않고 목적지 화면으로 이동한다.

### 기타

- Simplify the receive-first home surface

## v1.5.3 — 2026-08-21

### 개선

- Receive-first 화면을 TodayCard 중심으로 축소하고 후속 기능 카드를 목적지 화면으로 이동한다.

### 기타

- Install dependencies in remote deploys

## v1.5.2 — 2026-08-21

### 수정

- rsync 운영 배포 경로에서도 frozen dependency install을 실행해 선택적 Redis 모듈이 누락되지 않게 한다.

### 기타

- Release operational hardening
- Harden operational observability

## v1.5.1 — 2026-08-21

### 개선

- Make quick records private and traceable

### 기타

- Release the Receive-first redesign
- Open safe email and retreat operations
- Turn keyring visits into a receive-first release.
- EventLog 90일 retention systemd timer와 공개 Receive smoke 시나리오를 추가한다.
- ioredis bundling·middleware convention 경고를 제거하고 migration 전환 기준을 문서화한다.

## v1.5.0 — 2026-08-21

### 기능

- NFC 키링 진입을 Receive-first TodayCard 흐름으로 개편한다.
- 게스트 전역 말씀, Memory 타임캡슐, DailyCheckIn·PastEncounter를 추가한다.
- 수련회 Event와 관리자 이벤트 생성 화면을 추가한다.

### 수정

- quick 기록을 기본 비공개로 강제하고 카드 한 줄을 기록함에 연결한다.
- KST 날짜·타임캡슐 경계와 키링 비소유자 개인정보 경계를 고정한다.
## v1.4.4 — 2026-08-20

### 기타

- 보고서: 100% 배포 완료 보고서(커밋·푸시·배포·DB 무손실)를 보관한다

## v1.4.3 — 2026-08-20

### 기능

- ingest-chunks FTS fallback을 추가해 구형 SQLite 배포가 중단되지 않게 한다

## v1.4.2 — 2026-08-20

### 기타

- 빌드 게이트를 닫아 배포가 100%에서 중단되지 않게 한다

## v1.4.1 — 2026-08-20

### 기능

- 배포 FTS fallback을 추가해 구형 SQLite에서도 DB 손실 없이 배포되게 한다

## v1.4.0 — 2026-08-20

### 기능

- Gutendex 500 파이프라인과 Entry FTS를 열어 데이터와 검색을 100%로 확장한다

### 수정

- RAG orphan 배선을 복구하고 메인 노출을 열어 저장·조회가 세트로 동작하게 한다

### 기타

- 문서: 키링 프로모 영상과 최종 100% QA 보고서를 보관한다
- E2E Playwright 5경로와 100% 검증을 닫아 종합 완성도를 100%로 올린다
- Redis 분산과 rag-policy·expiresAt을 열어 단일 인스턴스 병목을 해소한다
- 코퍼스를 v4.3-corpus-expand로 승격해 46편중을 160+로 해소한다
- 기도 제목(PrayerTopic) 최소 흐름을 열어 흩어진 기도 추적을 닫는다
- 보안·신뢰 5건(R1/R4/R5/R6/R8)을 닫아 셸 주입과 타임아웃·윈도 불일치를 제거한다
- FTS5 토크나이저와 헬스·DB·CI 하드닝을 닫아 검색 정규화와 테스트 격리를 보장한다

## v1.3.6 — 2026-08-19

### 기타

- 오늘 붙들 말씀을 일일 랜덤 성구로 전환한다

## v1.3.5 — 2026-08-03

### 수정

- 로그인 장애 복구와 배포·모바일 개선 보고서를 남긴다

## v1.3.4 — 2026-08-03

### 개선

- 모바일 랜딩 내비 줄바꿈과 날짜·결단 라벨 가독성을 개선한다

## v1.3.3 — 2026-08-03

### 기타

- 운영 데이터 보존과 인증 흐름을 안전하게 배포한다

## v1.3.2 — 2026-08-03

### 수정

- 개발노트 파서 구문 오류를 복구한다

## v1.3.1 — 2026-08-03

### 기타

- 메인에 개발노트 요약을 보여 주고 /updates로 전체 이력을 연다

## v1.3.0 — 2026-08-03

첫 명시 버전. 2026-07-27 이후 main 이력을 기능 단위로 묶었습니다.

### 기능

- 돌아보기 거울 서사(4막·spine·1인칭 얼굴)와 AI 서사 계약
- 회고 AI: MiMo 재시도 + DeepSeek fallback
- `/suggest` 제안하기, 묵상 초안 초기화·에디터 포커스 UX
- 함께 피드 확장, 기록 공개/비공개, 이야기 거울 RAG·시각화

### 개선

- 디자인 시스템 통합, 오늘 홈 단순화, 성구 추천 정직화

### 수정

- 배포 FTS 충돌, redirect/cache, 폼 복구·삭제 확인

### 버전 히스토리(요약)

| 버전 | 시점 | 요약 |
|---|---|---|
| 1.3.0 | 2026-08-03 | 제안하기·에디터 UX·버전/노트 자동화 |
| 1.2.x | 2026-08-03 | 거울 서사 돌아보기 + AI fallback |
| 1.1.x | 2026-08-02 | 함께 피드·공개설정·디자인 토큰 |
| 1.0.x | 2026-07-29~08-01 | 회고/이야기거울 production-ready |
| 0.x | 2026-07-27~28 | 기반 기능·초안 에디터·신뢰 경계 |
