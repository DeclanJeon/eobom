# 작업지시서: 시각화 신선도 (Visualization Freshness) v1

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-07-31 |
| 설계 | `docs/design/visualization-freshness-v1.md` |
| 상태 | 구현 |

---

## 1. 목표

기록·회고 입력이 바뀌면 시각화가 stale로 표시되고,  
같은 입력이면 캐시, 다르면 재생성되도록 API·UI·테스트를 맞춘다.

## 2. 범위

### In
- `contentFingerprint` 계산 util
- freshness 파생 (`fresh` / `stale` / `none` / `legacy→stale`)
- POST 캐시 조건을 fingerprint 일치로 변경
- GET 목록 freshness 필드
- VisualizationCard stale UI
- lookback 시각화 카드 문구(소)
- 단위 테스트

### Out
- 저장 시 자동 이미지 생성
- 스키마 마이그레이션 필수화
- multi-kind, 히스토리 갤러리
- soft auto-refresh on page enter

---

## 3. 작업 분해

### T1. Fingerprint + freshness helpers
**파일:** `src/lib/story-mirror/visualization-fingerprint.ts` (신규)

Export:
```ts
computeVisualizationFingerprint(userId: string, opts?: { kind?: string; now?: Date }): Promise<string>
buildFingerprintPayload(...) // testable pure if data injected
getStoredFingerprint(dataJson: string | null | undefined): string | null
deriveVisualizationFreshness(args: {
  hasImage: boolean
  hasSynthesis: boolean
  storedFingerprint: string | null
  currentFingerprint: string
}): "none" | "fresh" | "stale"
parseVisualizationDataJson(dataJson: string | null | undefined): Record<string, unknown>
mergeFingerprintIntoDataJson(dataJson: object, fp: string): string
```

규칙: 설계 §4 준수. `crypto.createHash("sha256")`.

**완료:** 단위 테스트 green.

### T2. API POST/GET
**파일:** `src/app/api/story-mirror/visualize/route.ts`

POST:
- `force?: boolean` body 허용
- cache hit = image + synthesis + storedFp === currentFp && !force
- 재생성 시 dataJson에 `contentFingerprint`, `fingerprintVersion: 1`
- filename: `${kind}-${currentFp}.png` (또는 기존 hash 자리에 fp)

GET list:
- 각 row에 `freshness`, `contentFingerprint`, `currentFingerprint` 포함
- currentFp는 요청당 1회 계산 후 재사용

**완료:** 테스트 또는 스크립트 smoke + tsc.

### T3. UI card
**파일:** `src/components/visualization-card.tsx`

- props: `initial`에 freshness optional; 없으면 dataJson+client 비교 불가하므로 서버가 freshness 내려주거나 page에서 계산
- page 서버에서 currentFp/freshness 계산해 card에 전달 권장
- stale: 배지 + primary 다시 그리기 (`force: true` 또는 그냥 POST — mismatch면 재생성)
- fresh: 기존 + 다시 만들기
- force 시 body `{ kind, force: true }`

**파일:** `src/app/story-mirror/visualize/page.tsx`
- initial에 freshness 전달

### T4. Lookback hub copy
**파일:** `src/app/lookback/page.tsx`
- viz complete + stale 가능하면 문구 분기 (서버에서 fp 비교 1회)
- 부담되면 T4 skip 가능하나 권장

### T5. Tests
**파일:** `tests/visualization-fingerprint.test.ts` (신규)
- 안정 해시 / entry updatedAt 변경 / review hash 변경 / 추가·삭제 / legacy freshness / derive helpers

가능하면 API 캐시 분기는 mock 없이 pure helper로 검증.

### T6. Verify
- `bun test tests/visualization-fingerprint.test.ts` (+ 관련)
- `bunx tsc --noEmit`
- 배포는 리더 판단

---

## 4. 수용 기준 (설계 §10 동일)

1. 동일 입력 POST ×2 → 두 번째 cached
2. 입력 변경 후 POST → regenerate + 새 fp
3. stale UI 노출
4. entryCount < 3 유지
5. stale여도 이전 이미지 표시
6. tests + tsc pass

---

## 5. 구현 노트

- `UserVisualization` unique는 `[userId, kind, periodStart, periodEnd]` — 기존처럼 `findFirst` by periodStart 유지
- Prisma entry `updatedAt` 필드 존재 확인 후 select
- `buildVisualizationBrief` 시그니처 변경 최소화
- 클라이언트 periodStart 전송은 무시 가능 (서버 month)

---

## 6. DoD 체크

- [ ] 설계 문서 존재
- [ ] 본 WO 존재
- [ ] fingerprint util + tests
- [ ] API cache/freshness
- [ ] UI stale
- [ ] tsc clean
- [ ] 커밋 메시지 Lore trailers
