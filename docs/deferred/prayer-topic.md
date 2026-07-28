# 후속: 기도 주제 (PrayerTopic)

- 상태: **deferred** (UI 없음)
- 작성: 2026-07-28

## 현재 구현

Prisma `PrayerTopic` 모델이 있고, `createEntry` 시 `prayer` 필드가 있으면 자동으로 한 건 생성된다 (`src/lib/entries.ts`).

- `title`: 기도문 앞 80자
- `body`: 기도 전문
- `status`: `"continuing"`
- `sourceEntryId`: 원 기록

목록·완료·재개·필터 UI/API는 **없다**. 사용자는 기록 상세의 기도 필드로만 내용을 본다.

## 왜 남겼나

PRD의 “기도 주제 이어가기”를 스키마 수준에서 열어 두었으나, MVP 범위는 **기록·회고·함께·결단(ActionStep)** 에 집중했다. ActionStep은 Today에 노출되지만 PrayerTopic은 백그라운드 적재만 한다.

## 향후 제품화 시 최소 범위 (제안)

1. `/me/prayers` 또는 Today 섹션: continuing 목록  
2. 상태 전환: continuing → answered / paused  
3. 원 기록 링크  
4. soft 비노출(삭제 기록과 연동)

## 하지 말 것 (당분간)

- AI가 기도 응답 여부를 판정  
- 공개 피드에 기도 주제 자동 공유  
