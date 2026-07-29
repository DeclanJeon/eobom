# 이야기 거울 RAG v4.2 — 잔여 작업 설계 (Remaining Work)

> 상위 설계: `docs/design/story-mirror-rag-v4.md` (v4.2)
> 현재 상태: 핵심 파이프라인(FTS5 검색 → MiMo 스트리밍 → `StoryRagRun/Match` 저장 → `/story-mirror/reflect` 화면)은 구현·테스트·배포 완료.
> 이 문서는 **사용자 체감상 미완성**이거나 **설계 세부가 단순화**된 항목을 우선순위별로 정리한다.
> 토크나이저(unicode61), 권리 게이트, MiMo 스트리밍 단일 호출 등 핵심 제약은 v4.2와 동일하게 유지한다.

---

## 0. 우선순위 요약

| ID | 항목 | 우선순위 | 지금 해야 하나? | 근거 |
|----|------|---------|--------------|------|
| P1-1 | RAG 실행 이력 저장·재조회 | **High** | O | 결과가 새로고침하면 사라짐(저장만 하고 못 봄) |
| P1-2 | 메인 페이지/홈 카드에 RAG 연결 노출 | **High** | O | 입구에서 RAG가 안 보임(별도 탭에만 격리) |
| P2-1 | RAG 연결 피드백 경로 | Medium | △ | 참여/품질 신호 필요하나 핵심 동작과 무관 |
| P2-2 | `StoryRagEvidence` 엔트리 근거 연결 | Medium-Low | X | 자유 텍스트 입력 기반이라 영향适中, 엔트리 선택 UI 필요 |
| P3-1 | `rag-policy.ts` 안전 모듈 분리 | Low | X | 호출 지점 1곳, 인라인 게이트로 충분 |
| P3-2 | 버전 불일치 비활성화 게이트 + 매니페스트 | Low | X | 현재 단일 코퍼스, 운영 리스크 낮음 |
| P3-3 | `expiresAt` + 정리 작업 | Low | X | 데이터량 작음, 수동 정리로 충분 |
| P3-4 | 실제 MiMo 네트워크 E2E | Low | X | 운영 키 존재, 모의로 검증됨(운영 스모크로 대체) |
| P3-5 | Gutendex 500권 코퍼스 수집 완료 | Low(별개 과제) | X | v4.2는 시드 46청크로 동작, 확장은 별도 이니셔티브 |

**권장 순서:** P1-1 → P1-2 → (P2-1) → P3-* 전부 defer.

---

## 1. P1 — 사용자 체감 핵심 gap

### P1-1. RAG 실행 이력 저장·재조회

**문제**
- `POST /api/story-mirror/rag/runs/stream` 이 `StoryRagRun`(status=complete)과 `StoryRagMatch`(connection/differentPerspective)를 저장하지만, **조회 API·화면이 없다.**
- `/story-mirror/reflect` 클라이언트는 스트리밍 결과를 메모리에만 두고, 페이지 이탈/새로고침 시 결과 증발.

**변경 설계**

1) 라우트 추가
- `GET /api/story-mirror/rag/runs`
  - 인증: `requireApiUser`
  - 응답:
    ```json
    {
      "runs": [
        {
          "id": "run_xxx",
          "createdAt": "2026-07-29T...",
          "summary": "…",
          "connectionCount": 3,
          "corpusVersion": "v4.2-seed-1"
        }
      ]
    }
    ```
  - 쿼리: `storyRagRun.findMany({ where: { userId, status: "complete" }, orderBy: { createdAt: "desc" }, take: 20 })`
- `GET /api/story-mirror/rag/runs/[id]`
  - 응답:
    ```json
    {
      "run": {
        "id": "run_xxx",
        "createdAt": "…",
        "summary": "…",
        "connections": [
          {
            "chunkId": "c_xxx",
            "title": "엘리자베트",
            "workTitle": "오만과 편견",
            "locator": null,
            "connection": "…",
            "differentPerspective": "…"
          }
        ]
      }
    }
    ```
  - 쿼리: `storyRagRun.findFirst({ where: { id, userId, status: "complete" }, include: { matches: { where: { state: "active" }, include: { chunk: { include: { work: true } } } } } })`
  - 누락/권한 없음 → 404.

2) UI (`/story-mirror/reflect`)
- 서버 페이지가 `latestRun`(위 쿼리)을 클라이언트에 `initialRun` prop으로 전달.
- 클라이언트는 마운트 시 `initialRun` 있으면 바로 "complete" 상태로 렌더(입력 없이도 과거 결과 표시).
- 입력 영역 아래 "지난 연결" 접이식 목록: `GET /api/story-mirror/rag/runs`로 목록 조회, 항목 클릭 시 `GET /api/story-mirror/rag/runs/[id]`로 상세 치환.
- 새 스트리밍 완료 시 목록 갱신.

**수용 기준**
- 과거 `complete` run이 새로고침 후에도 재조회된다.
- run 목록/상세 API는 미인증 401, 타인 run 404.
- 단위 테스트: 목록/상세 조회 + 권한 경계.

---

### P1-2. 메인 페이지/홈 카드에 RAG 연결 노출

**문제**
- `/story-mirror`(메인)와 `StoryMirrorHomeCard`(오늘 홈)는 `getLatestRun()`(구 카드 매칭)만 표시.
- 신규 RAG 연결은 "연결" 탭에만 격리되어, 랜딩에서 발견되지 않음.

**변경 설계 (기존 카드 매칭 유지 + RAG 섹션 추가)**

1) `src/app/story-mirror/page.tsx`
- `getLatestRun` 외에 `getLatestRagRun(userId)` 추가(서버 util):
  ```ts
  export async function getLatestRagRun(userId: string) {
    return db.storyRagRun.findFirst({
      where: { userId, status: "complete" },
      orderBy: { createdAt: "desc" },
      include: { matches: { where: { state: "active" }, include: { chunk: { include: { work: true } } } } },
    });
  }
  ```
- 메인 카드 그리드 아래(또는 위)에 **"최근 거울 연결"** `SurfaceCard` 1장 추가:
  - 요약(`run.summary`) 2~3줄 + 연결 개수 배지 + "연결 탭에서 더 보기 →" 링크(`/story-mirror/reflect`).
  - run 없으면 섹션 자체를 렌더하지 않음(빈 상태 아님).

2) `src/components/story-mirror-home-card.tsx`
- `storyMirrorEnabled` gate 외에 `latestRagRunId?` prop 추가(선택).
- 있다면 소제목 우측에 "거울 연결 N →" 작은 링크 노출(클릭 시 `/story-mirror/reflect`).
- 카드 매칭 영역은 그대로 둬 혼선 방지(두 시스템을 시각적으로 구분: 카드=고전 인물 카드, RAG=연결 요약).

**수용 기준**
- 메인 랜딩에서 최신 RAG 연결 요약이 노출된다(카드 매칭 영역 훼손 없이).
- RAG run 없는 사용자는 기존과 동일하게 빈 상태.

---

## 2. P2 — 참여/근거 (선택 구현)

### P2-1. RAG 연결 피드백 경로

**문제:** 카드 매칭엔 `matches/[id]/feedback`,`dismiss`가 있으나 RAG 연결엔 반응 경로가 없음.

**변경 설계**
- 스키마: `StoryMirrorFeedback`에 `storyRagMatchId String?` + relation `storyRagMatch StoryRagMatch?` + `@@index([storyRagMatchId, userId, type])` 추가(기존 `matchId`와 배타적).
- 라우트: `POST /api/story-mirror/rag/runs/[id]/feedback`
  - body: `{ matchId: string, type: "like" | "not_helpful" | "report" }`
  - 검증: run 소유권 + match가 해당 run에 속하는지 확인.
  - 기존 `upsert` 로직 재사용(`@@unique([matchId, userId, type])` → `storyRagMatchId` 버전으로 복제).
- UI: 각 연결 `SurfaceCard` 하단에 👍/신고 버튼 2개(상태 토글). report는 `not_helpful`+플래그로 단순화.

**수용 기준:** 연결별 피드백이 저장·토글된다. 단위 테스트: 권한/중복 upsert.

### P2-2. `StoryRagEvidence` 엔트리 근거 연결

**문제:** 모델만 존재, 행 미생성. 설계상 "연결의 근거가 된 사용자 기록"을 남기려 했으나 현재는 자유 텍스트 입력.

**변경 설계 (엔트리 선택 UI 필요 → 후순위)**
- SSE 요청에 선택적 `entryIds?: string[]` 추가.
- `complete` 시 각 matched chunk에 대해, 제공된 entry 중 텍스트 유사/시간 인접성을 기준으로 `StoryRagEvidence` 생성(`role: "supporting"`).
- 전제: reflect 입력이 "자유 텍스트"에서 "기록 선택 + 보조 텍스트"로 확장되어야 함 → 별도 UI 작업. **따라서 P2 중에서도 가장 나중.**

**수용 기준:** entry 선택 플로우 존재 시, 연결별로 근거 엔트리 0~N개 저장.

---

## 3. P3 — 위생/운영 (명시적 Defer)

> 이 항목들은 **지금 하지 않아도 서비스 동작·안전성에 영향이 없다.** 필요할 때(운영 이슈/확장 시점) 점진적으로 편입.

### P3-1. `rag-policy.ts` 안전 모듈 분리
- `consentSnapshot` 검증 + `rightsStatus/corpusVersion` 필터를 공유 모듈로 추출. 현재 호출 지점이 SSE 라우트 1곳뿐이라 인라인 유지 가능. 분리 시점: 호출 지점 ≥2개 되거나 감사 요구사항 생길 때.

### P3-2. 버전 불일치 비활성화 게이트 + 코퍼스 매니페스트
- `corpus_manifest.json`(corpusVersion/retrieverVersion/generatorVersion/policyVersion) 보관.
- 요청 시 저장된 run 버전 ≠ 현재 버전이면 read-only 표시(`deprecated`). 현재 단일 코퍼스(v4.2-seed-1) 고정이므로 운영 리스크 낮음.

### P3-3. `expiresAt` + 정리 작업
- `StoryRagRun.expiresAt` 기본 +90일 설정, 배치/크론으로 만료 run+match+evidence 정리. 데이터량 작아 수동 정리로 충분.

### P3-4. 실제 MiMo 네트워크 E2E
- 모의 fetch로 검증 완료. 운영 배포 후 `curl` 스모크(헤더/상태 코드)로 대체 가능. 별도 테스트 인프라 불필요.

### P3-5. Gutendex 500권 코퍼스 수집 완료
- 별개 이니셔티브. `scripts/story-mirror/01-fetch-gutendex.ts` 진행 중(256~384권 수준), `data/story-mirror/gutenberg-*.json` 미스테이지.
- v4.2는 시드 46청크(approved)로 동작하므로 **코퍼스 확장은 별도 승인 파이프라인 완성 후** 편입. ingest 스크립트는 이미 corpusVersion 기반 멱등이라 신규 청크 추가 시 `ingest-chunks.ts`만 보강하면 됨.

---

## 4. 시퀀싱 권장

1. **P1-1** (이력 조회) — 가장 체감 큰 gap, 저장된 데이터를 활용하는 작은 추가.
2. **P1-2** (메인 노출) — 발견성 확보.
3. *(선택)* **P2-1** (피드백) — 참여 신호 필요 시.
4. **P2-2 / P3-\*** — 엔트리 선택 UI·운영 요구사항 발생 시.

각 단계는 독립적으로 배포 가능(스키마 변경 있으면 `prisma db push` + 필요 시 `fts5-setup` 재실행, `deploy.sh`가 이미 ingest까지 수행).

## 5. 검증 계획 (공통)
- `bunx tsc --noEmit` 0 에러, `bun run test:unit` 전체 통과.
- 신규 API는 `tests/`에 권한 경계(401/404) + 정상 조회 단위 테스트 추가.
- `bun run build` + 운영 배포 후 헬스(`/story-mirror/reflect` 307, API 401) 확인.
- 실제 로그인 세션 브라우저에서 이력 렌더·메인 노출 시각 확인(자동화 불가 영역).
