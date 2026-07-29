# Story Mirror — 잔여 구현 작업

## 목표
이야기 거울(Story Mirror) 기능의 잔여 구현 작업을 완료한다.
현재까지 Prisma 모델(9개), 매칭 코어, API(6개), UI(3개), 테스트(22개)가 구현되었다.
이제 시각화 파이프라인과 UX를 추가하고, 시드 데이터를 주입하며, 전체 빌드를 검증한다.

## 제약조건
- 기존 eobom 아키텍처를 따른다 (Next.js 16, Prisma + SQLite, Bun)
- 브랜드 톤을 유지한다 (온화한 동행자, 점수·랭킹 금지)
- 기존 67개 테스트를 깨뜨리지 않는다
- codex-imagen은 ponslink 서버의 `~/bin/codex-imagen`을 사용한다
- 이미지 생성 시 사용자에게 대기 UX를 제공한다

## 스토리 목록

### G001: UserVisualization 모델 + 시각화 데이터 추출기
- Prisma에 `UserVisualization` 모델 추가
- `db push` 마이그레이션
- `src/lib/story-mirror/visualize-data.ts` 구현
  - 기록에서 타임라인 데이터 추출
  - 기록에서 네트워크 데이터 추출 (주제 동시출현)
  - 기록에서 감정 분포 데이터 추출
  - 매칭 결과에서 스토리 매칭 데이터 추출

### G002: 시각화 API + codex-imagen 래퍼
- `POST /api/story-mirror/visualize` — 시각화 이미지 생성
- `GET /api/story-mirror/visualize` — 시각화 목록 조회
- `src/lib/story-mirror/image-gen.ts` — codex-imagen 호출 래퍼
  - SSH로 ponslink의 codex-imagen 호출
  - 생성된 이미지를 public/story-mirror/vis/에 저장
  - 에러 핸들링 + 폴백

### G003: 이미지 생성 로딩 UX
- 이미지 생성 중 사용자에게 대기 상태 표시
- StoryMirrorHomeCard에 로딩 스피너 추가
- story-mirror 메인 페이지에 이미지 생성 상태 표시
- 생성 완료 시 자동 업데이트

### G004: 오늘 홈 연결 + 시드 주입
- `today/page.tsx`에 `StoryMirrorHomeCard` 연결
- 시드 데이터 주입 (`bun run scripts/story-mirror/seed-corpus.ts`)
- 성경 인물 카드 `reviewStatus`를 `published`로 전환

### G005: API 테스트 + 빌드 검증
- `tests/story-mirror-api.test.ts` — visualize API 테스트
- `bun run build` 빌드 회귀 검증
- 전체 테스트 실행 (89개+)

## 수용 기준
- 모든 Prisma 마이그레이션 성공
- 시각화 API가 이미지를 정상 생성
- codex-imagen 호출이 ponslink에서 정상 동작
- 이미지 생성 중 사용자에게 로딩 UX 표시
- 오늘 홈에 StoryMirrorHomeCard 표시
- 시드 데이터가 DB에 주입됨
- 성경 인물 카드가 published 상태
- 기존 67개 테스트 + 신규 테스트 모두 통과
- `bun run build` 성공
