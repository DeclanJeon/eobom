# 작업지시서: 시각화 신선도 (Visualization Freshness) v1

| 항목 | 내용 |
|------|------|
| 작성일 | 2026-07-31 |
| 설계 | `docs/design/visualization-freshness-v1.md` |
| 상태 | 완료 (deployed `be0236b`+) |

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

### T1. Fingerprint + freshness helpers — done
**파일:** `src/lib/story-mirror/visualization-fingerprint.ts`

### T2. API POST/GET — done
**파일:** `src/app/api/story-mirror/visualize/route.ts`

### T3. UI card — done
**파일:** `src/components/visualization-card.tsx`, `src/app/story-mirror/visualize/page.tsx`

### T4. Lookback hub copy — done
**파일:** `src/app/lookback/page.tsx`

### T5. Tests — done
**파일:** `tests/visualization-fingerprint.test.ts` (11 pass)

---

## 4. 수용 기준

1. 동일 입력 POST ×2 → 두 번째 cached
2. 입력 변경 후 POST → regenerate + 새 fp
3. stale UI 노출
4. entryCount < 3 유지
5. stale여도 이전 이미지 표시
6. tests + tsc pass

---

## 5. 구현 노트

- fingerprint = sha256(review + recent 20 entries metadata).slice(0,16)
- cache hit skips MiMo brief + image-gen
- filename: `summary-{fingerprint}.png`
- legacy rows without fp → stale

---

## 6. DoD 체크

- [x] 설계 문서 존재
- [x] 본 WO 존재
- [x] fingerprint util + tests
- [x] API cache/freshness
- [x] UI stale
- [x] tsc clean
- [x] 커밋·푸시·배포
