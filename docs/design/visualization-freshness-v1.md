# 시각화 신선도 (Visualization Freshness) v1 설계

- 문서 버전: **v1.0**
- 작성일: 2026-07-31
- 상태: **구현 대상 확정안**
- 관련:
  - `src/app/api/story-mirror/visualize/route.ts`
  - `src/lib/story-mirror/visualization-brief.ts`
  - `src/components/visualization-card.tsx`
  - `src/app/story-mirror/visualize/page.tsx`
  - `prisma/schema.prisma` → `UserVisualization`
- 작업지시서: `docs/work-orders/WO-2026-07-31-visualization-freshness.md`

---

## 0. 한 줄 요약

기록·회고가 바뀌면 시각화는 **자동으로 “옛 장면”이 되고**,  
같은 입력이면 **캐시**, 입력이 달라지면 **다시 그리기**로 최신 장면이 된다.  
저장 시점마다 이미지를 찍지 않는다.

---

## 1. 문제

현재 POST 캐시 조건:

1. 같은 달(`periodStart = 이번 달 1일`)
2. 기존 `imageUrl` 존재
3. `dataJson.synthesis` 존재

이면 **무조건 cached 반환**.

결과:
- 기록 추가/수정, 회고 재생성 후에도 이미지가 고정
- “기록이 쌓이면 장면이 변한다”는 제품 약속과 불일치
- `imageBrief` 해시는 재생 시에만 쓰여, 캐시 hit 판정에 입력 신선도가 없다

---

## 2. 목표 / 비목표

### 목표
- 입력(최신 회고 + 최근 기록 집합)이 바뀌면 시각화는 `stale`
- 동일 입력이면 재생성 없이 캐시
- stale UI에서 한 번의 액션으로 최신 이미지 생성
- 추가 AI 호출은 재생성 시에만

### 비목표 (v1)
- entry 저장마다 백그라운드 이미지 자동 생성
- 실시간 스트리밍 그림
- 여러 kind 확장 (summary만)
- DB 스키마 필수 마이그레이션 (v1은 `dataJson`에 fingerprint 저장)
- 월별 히스토리 갤러리 UI (v1.1)

---

## 3. 원칙

| ID | 원칙 | 함의 |
|----|------|------|
| P1 | 시각화는 거울이지 박제가 아니다 | 입력 변경 → stale |
| P2 | 사용자 주도 재생성 | 글 저장 시 이미지 강제 생성 금지 |
| P3 | 이전 장면은 남겨 둔다 | stale여도 imageUrl 유지, 빈 화면 금지 |
| P4 | 캐시는 입력 fingerprint 기준 | month-only 캐시 폐기 |
| P5 | brief/image AI는 비쌀 수 있다 | hit 시 MiMo·image-gen 스킵 |
| P6 | 판정·처방 톤 금지 | 기존 visualization-brief 가드레일 유지 |

---

## 4. contentFingerprint

### 4.1 정의

시각화 입력의 안정 해시. **AI 출력이 아니라 입력**을 해싱한다.

```ts
type VisualizationFingerprintPayload = {
  v: 1;
  kind: "summary";
  periodStart: string; // YYYY-MM-01 ISO date
  reviewId: string | null;
  reviewHash: string | null; // sha256(structuredOutput).slice(0, 16)
  entryCount: number;
  entries: Array<[id: string, updatedAt: string]>; // latest 20, desc by entryDate
};
```

```text
contentFingerprint = sha256(canonicalJSON(payload)).slice(0, 16)
```

### 4.2 포함 범위 (brief 입력과 정렬)

`buildVisualizationBrief`가 읽는 것과 동일:
- 최신 `ReviewReport` 1개 (삭제되지 않음)
- 최근 `ReflectionEntry` 20개 (`deletedAt: null`, `entryDate desc`)

entry 본문 전체 해시 대신 `id + updatedAt` 사용:
- 본문 수정 시 `updatedAt` 변경 전제 (Prisma `@updatedAt` 확인)
- 삭제된 기록은 목록에서 빠지므로 count/ids 변화로 감지

### 4.3 저장

`UserVisualization.dataJson`에 병합:

```json
{
  "entryCount": 12,
  "reviewId": "...",
  "source": "mimo",
  "headline": "...",
  "synthesis": "...",
  "imageBrief": "...",
  "themes": [],
  "emotions": [],
  "contentFingerprint": "a1b2c3d4e5f67890",
  "fingerprintVersion": 1
}
```

스키마 컬럼 추가는 v1 필수 아님.  
(선택 v1.1: `inputFingerprint String?` 인덱스)

---

## 5. 상태 모델

DB `status` 값은 기존 유지: `pending | generating | complete | failed`

**신선도는 조회 시 파생:**

```ts
type Freshness = "none" | "fresh" | "stale" | "legacy";

// complete + image + synthesis + fingerprint match → fresh
// complete + image + fingerprint mismatch or missing fp → stale (legacy missing fp = stale)
// no row / no image → none
```

`legacy`: fingerprint 없는 구 데이터 → **stale로 취급** (다시 만들면 fp 기록).

---

## 6. API

### 6.1 POST `/api/story-mirror/visualize`

Request:
```json
{ "kind": "summary", "force": false }
```

(`periodStart/periodEnd` 클라이언트 전송은 무시하거나 서버 month bucket으로 덮어씀 — 서버 권위)

Algorithm:

```text
1. auth + kind 검증 + entryCount >= 3
2. periodStart = monthStart(now)
3. currentFp = computeVisualizationFingerprint(userId, kind, periodStart)
4. existing = findFirst({ userId, kind, periodStart }) orderBy createdAt desc
5. if !force && existing.imageUrl && hasSynthesis && storedFp === currentFp
     → return cached complete
6. brief = buildVisualizationBrief(userId)
7. generate image (filename hash includes currentFp)
8. upsert row; dataJson includes contentFingerprint=currentFp
9. return complete, cached=false
```

캐시 hit 시 **MiMo brief / image-gen 호출 금지**.

### 6.2 GET `/api/story-mirror/visualize`

목록 응답에 파생 필드 추가:

```json
{
  "visualizations": [
    {
      "id": "...",
      "kind": "summary",
      "status": "complete",
      "freshness": "stale",
      "contentFingerprint": "old",
      "currentFingerprint": "new",
      "imageUrl": "...",
      "dataJson": "...",
      "createdAt": "..."
    }
  ]
}
```

파일 서빙(`?file=`) 동작 불변.

### 6.3 Write-path stale 마킹 (optional v1)

entry/review 저장 시 이미지 재생성 금지.  
조회 시 fingerprint 비교만으로도 충분하므로 **v1 필수 아님**.

원하면 thin helper:
```ts
// no-op safe; future hook point
export async function noteVisualizationInputsChanged(userId: string) {}
```

---

## 7. UI

### `/story-mirror/visualize` + `VisualizationCard`

| freshness | UI |
|-----------|-----|
| none | dashed CTA “회고와 기록으로 이미지 만들기” |
| fresh | 이미지 + 해설 + “다시 만들기”(force) |
| stale | 이미지 유지 + 배지 “기록이 달라졌어요” + primary “이 흐름으로 다시 그리기” |
| loading | 기존 스피너 |
| failed | 재시도 |

카피 (허용):
- `기록이 더 쌓이거나 회고가 달라졌어요`
- `이 흐름으로 다시 그리기`
- `같은 기록 기준으로 만든 장면입니다` (fresh 보조, optional)

금지:
- `추천 이미지`, `오늘의 비전`, 운세/계시 톤

### Lookback hub (optional v1)

`/lookback` 시각화 카드:
- fresh: 기존 문구
- stale: `새 기록 반영 가능`
- none: `이미지 만들기`

v1 범위에 포함 권장(작음).

---

## 8. 파일명 / 저장

```text
filename = `${kind}-${contentFingerprint}.png`
```

동일 fingerprint → 동일 파일 덮어쓰기 허용.  
다른 fingerprint → 새 파일 (이전 파일 orphan 가능, v1 청소 불필요).

---

## 9. 테스트

단위:
1. fingerprint 안정성 (동일 입력 → 동일 해시)
2. entry updatedAt 변경 → 해시 변경
3. review structuredOutput 변경 → 해시 변경
4. entry 삭제/추가 → 해시 변경
5. POST cache hit when fp match (generateImage/brief not called — mock)
6. POST regenerates when fp mismatch
7. legacy dataJson without fp → freshness stale
8. freshness helper pure tests

---

## 10. 수용 기준

1. 동일 기록/회고로 POST 두 번 → 두 번째는 `cached: true`, 이미지 경로 동일
2. 기록 1건 추가 후 POST(force false) → 재생성, 새 fingerprint 저장
3. 화면에서 stale 배지와 다시 그리기 CTA 노출
4. entryCount < 3 가드 유지
5. 기존 complete 이미지 stale 시에도 표시 유지
6. `bun test` 관련 + `tsc --noEmit` 통과

---

## 11. 롤아웃

1. lib fingerprint + freshness helpers + tests
2. API POST/GET 계약
3. VisualizationCard UI
4. lookback 문구 (가능하면 같이)
5. 배포

---

## 12. 후속 (v1.1+)

- `inputFingerprint` 컬럼 + index
- visualize 진입 soft auto-refresh (stale 시 1회)
- 월별 히스토리 목록
- 회고 생성 완료 → 시각화 deep link
