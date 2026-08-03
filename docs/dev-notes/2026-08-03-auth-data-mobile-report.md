# 이어봄 운영 장애 대응·복구·배포 안전화·모바일 UI 개선 보고서

- 날짜: 2026-08-03
- 대상: `eobom.ponslink.com`
- 범위: Google 로그인 실패 진단, 운영 SQLite 무결성 복구, 계정 데이터 복원, 배포 스크립트 안전화, 모바일 UI/UX 개선
- 주요 커밋:
  - `e59b345` 운영 데이터 보존과 인증 흐름을 안전하게 배포한다
  - `79b68f8` 모바일 랜딩 내비 줄바꿈과 날짜·결단 라벨 가독성을 개선한다
- 관련 릴리즈 커밋: `1d6f876` chore(release): v1.3.3

---

## 1. 요약

| 항목 | 결과 |
|---|---|
| Google 로그인 실패 원인 | OAuth 설정 문제가 아니라 **고아 Account/Session**으로 인한 Prisma adapter 오류 |
| 데이터 유실 여부 | 고아 레코드 정리 과정에서 기존 사용자 데이터가 삭제됐음 → **백업에서 복구 완료** |
| 가입 계정 재등록 문제 | 기존 계정을 재가입시키지 않고 **원래 User/Account/좌석 연결로 복원** |
| 배포 안전성 | `prisma db push --accept-data-loss` 제거, 배포 전 DB 자동 백업 추가 |
| 모바일 UI | 랜딩 헤더 줄바꿈, 날짜 요일 표기, 열린 결단 중복 라벨 수정 |
| 최종 상태 | 서비스 active, FK 오류 0, 계정 4개 복원, health 200 |

---

## 2. 문제 1 — Google 로그인이 “로그인 실패”로 끝나는 현상

### 2.1 증상

- 사용자 화면: `/login?error=...` 에서 일반 문구만 표시  
  `로그인에 실패했습니다. 다시 시도해 주세요.`
- Google 로그인 화면까지는 정상 이동
- OAuth callback 이후 세션이 생성되지 않음

### 2.2 원인

운영 로그에서 반복된 실제 오류:

```text
[next-auth][error][adapter_error_getUserByAccount]
Invalid `prisma.account.findUnique()` invocation:
Inconsistent query result: Field user is required to return data, got `null` instead.

[next-auth][error][OAUTH_CALLBACK_HANDLER_ERROR]
```

즉 Google OAuth 자체(Client ID/redirect URI)는 정상이었고, NextAuth가 DB에서 Google 계정을 조회할 때 `Account.userId`가 가리키는 `User` 행이 없어 Prisma adapter가 실패했습니다.

당시 운영 DB 상태(복구 직전):

```text
users            1
accounts         4
orphan_accounts  4
sessions        15
orphan_sessions 15
```

### 2.3 왜 화면에는 구체 오류가 안 보였나

`src/app/login/page.tsx`는 NextAuth error 파라미터를 숨기고 모든 실패를 동일 문구로 표시합니다. 운영 디버깅에는 서버 로그(`journalctl -u eobom`)가 필요했습니다.

### 2.4 1차 조치

1. 운영 DB 백업  
   `db/eobom.db.pre-auth-repair-20260803-154715`
2. 존재하지 않는 User를 참조하는 고아 `Account` 4개, `Session` 15개 삭제
3. 인증 엔드포인트 재검증  
   `/api/auth/providers` 200, `/api/auth/session` 200  
   Google 로그인 진입 정상

이 조치로 **로그인 콜백의 즉시 실패 경로**는 제거됐습니다.  
다만 이후 무결성 정리와 데이터 복구 과정에서 추가 작업이 필요했습니다.

---

## 3. 문제 2 — 기존 데이터가 사라진 것처럼

### 3.1 무슨 일이 있었나

고아 레코드 정리 시 “존재하지 않는 User를 참조하는 행”을 삭제했습니다.  
문제는 기존 가입 사용자의 `User` 행이 이미 사라진 상태에서, 그 사용자들의 기록/리뷰/공유 데이터가 고아로 남아 있었고, 이를 정리 대상으로 삼은 점입니다.

특히 `syas0301@gmail.com`의 과거 기록은 이전 User ID  
`cms1zf2sk0000kfqa4sfcehva` 에 묶여 있었고,  
현재 로그인 후 남은 User ID는  
`cmsd7c8e60000kf5hrpyhj010` 이었습니다.

### 3.2 원인 평가

- **직접 원인:** 고아 레코드 정리 시 이메일/좌석/Account 매핑을 먼저 복원하지 않고 삭제
- **선행 상태:** 운영 DB에 이미 User 유실 + 하위 테이블 orphan이 존재
- **가능 배경:** 과거 `prisma db push --accept-data-loss` 기반 배포/스키마 동기화, 또는 DB 교체/부분 손실  
  (정확한 최초 삭제 시각/명령은 로그로 확정하지 못함)

### 3.3 복구 원칙

1. 현재 DB를 다시 백업한 뒤 진행
2. 식별 가능한 기존 계정은 **재가입이 아니라 기존 identity 복원**
3. 이미 새로 로그인돼 생긴 현재 User가 있으면 **기존 데이터를 그 User로 병합**
4. 식별 불가능한 세션-only 고아는 임의 계정 생성하지 않음

---

## 4. 데이터 복구 결과

### 4.1 복구 대상 계정

| 이메일 | 복구 방식 | 좌석 | 기록 수 | Google Account |
|---|---|---|---:|---|
| `syas0301@gmail.com` | 현재 User에 과거 데이터 병합 | e01 | 5 | 유지/연결 |
| `sukang3609@gmail.com` | 재로그인으로 생긴 현재 User에 과거 데이터 병합 | e07 | 2 | 기존 연결 유지 |
| `chan110197@gmail.com` | 기존 User ID + Account 재생성 | e13 | 0 | 복원 |
| `pk565789@gmail.com` | 기존 User ID + Account 재생성 | e06 | 0 | 복원 |

### 4.2 최종 계정 상태

```text
chan110197@gmail.com | e13 | entries=0 | accounts=1
pk565789@gmail.com   | e06 | entries=0 | accounts=1
sukang3609@gmail.com | e07 | entries=2 | accounts=1
syas0301@gmail.com   | u-smoke-daily | entries=5 | accounts=1
foreign_key_check    | 0
```

### 4.3 sukang3609@gmail.com 기록 요약

1. **2026-08-02 — 생명의 떡**  
   - 성경: 요한복음 6:48-57  
   - 김경민 목사님 설교 묵상, 영혼이 허기질 때 찾는 것, 봉사 제의 분별
2. **2026-08-03 — QT**  
   - 성경: 마태복음 1:18-25  
   - 마리아·요셉의 순종, 믿음으로 순종하기

첫 기록은 백업 복구분, 둘째 기록은 복구 이후 새로 작성된 기록입니다.

### 4.4 운영 백업 파일

```text
/home/declan/apps/eobom/db/eobom.db.pre-auth-repair-20260803-154715
/home/declan/apps/eobom/db/eobom.db.pre-integrity-repair-20260803-155126
/home/declan/apps/eobom/db/eobom.db.pre-restore-20260803-160620
/home/declan/apps/eobom/db/eobom.db.pre-account-restore-20260803-161730
/home/declan/apps/eobom/db/eobom.db.pre-schema-20260803-155926
/home/declan/apps/eobom/db/eobom.db.pre-schema-20260803-170036
```

원본 복구 기준 백업:  
`eobom.db.pre-auth-repair-20260803-154715`

---

## 5. 배포 안전화

### 5.1 변경 파일

`deploy/deploy.sh`

### 5.2 변경 내용

1. 스키마 동기화 전 운영 DB 자동 백업  
   `db/eobom.db.pre-schema-YYYYMMDD-HHMMSS`
2. `prisma db push --accept-data-loss` 제거  
   → `prisma db push` 만 허용
3. 데이터 손실이 필요한 스키마 변경이면 배포가 중단되도록 변경
4. 로컬/원격 배포 경로 모두 동일 적용
5. rsync는 계속 `db`, `.env`, 업로드 자산 제외

### 5.3 검증

- 임시 DB 복사본에서 FTS 정리 + `prisma db push` 성공
- 운영 배포 시 `The database is already in sync with the Prisma schema.`
- 배포 전후 주요 테이블 행 수 비교로 추가 데이터 손실 없음 확인

---

## 6. 모바일 UI/UX 개선

### 6.1 감사 범위

모바일 뷰포트 390×844에서 다음 화면 점검:

- 랜딩(`/`)
- 로그인
- 오늘
- 기록 목록/작성/상세
- 성구 선택 모달
- 돌아보기
- 함께
- 내 정보
- 키링(`/j/e01`)

### 6.2 수정 사항

| 문제 | 수정 |
|---|---|
| 랜딩 상단 내비가 모바일에서 두 줄로 깨짐 | `개발노트/제안하기/문의`를 `md+` 전용으로 숨기고 `로고+로그인`만 유지 |
| 날짜가 `2026년 8월 3일 월`처럼 어색함 | `formatDateKo`를 `2026년 8월 3일 (월)` 형식으로 변경 |
| 열린 결단 카드에 eyebrow/chip 중복 | `pending` 상태에서는 상태 칩 숨김 |

### 6.3 관련 파일

- `src/components/landing-hero.tsx`
- `src/lib/utils.ts`
- `src/components/open-action-card.tsx`

### 6.4 배포 후 확인

- 랜딩 모바일 헤더: `이어봄` + `로그인` 한 줄
- 오늘 페이지: `2026년 8월 3일 (월)`
- 열린 결단: 중복 상태 칩 없음
- 서비스 active, health 200

### 6.5 Cloudflare 캐시 메모

배포 직후 엣지가 잠시 옛 HTML을 제공했습니다.

```text
cf-cache-status: HIT
cache-control: private, no-cache, no-store ...
```

원본(`127.0.0.1:3120`)에는 즉시 반영됐고, 이후 엣지도 새 HTML을 내려주었습니다.  
향후 배포 후 HTML이 안 바뀌면 Cloudflare 캐시 상태를 먼저 확인해야 합니다.

---

## 7. 검증 체크리스트

### 인증·서비스

- [x] `/api/health` 200
- [x] `/api/auth/providers` 200
- [x] Google OAuth 진입 정상
- [x] 기존 4계정 세션/me 접근 가능
- [x] `systemctl is-active eobom` → active

### 데이터

- [x] `PRAGMA foreign_key_check` = 0
- [x] syas 기록 5개 복구
- [x] sukang 기록 2개 복구
- [x] chan/pk 계정·좌석·Google Account 복구
- [x] 배포 전후 데이터 보존 확인

### 코드/배포

- [x] `bun run test` 316 pass
- [x] `bun run build` 성공
- [x] main push
- [x] `deploy/deploy.sh --remote` 성공
- [x] 모바일 랜딩/오늘 화면 재검증

---

## 8. 남은 위험과 권고

1. **Cloudflare HTML 캐시**
   - 배포 직후 엣지가 옛 HTML을 줄 수 있음
   - 권고: 배포 스크립트에 Cloudflare purge(또는 Cache-Control/rule 정리) 추가

2. **SQLite 운영 백업 정책**
   - 이번 사고 대응으로 여러 스냅샷이 생겼지만, 정기 백업 자동화는 별도 정리가 필요
   - 권고: 일 단위 오프사이트 백업 + 배포 전 백업 유지기간 정책

3. **고아 데이터 정리 절차**
   - 앞으로 orphan cleanup은 무조건  
     `Account/Session 이메일·좌석 매핑 복원 → 사용자 복구 → 그다음 정리` 순서
   - “User 없는 행 = 삭제”를 바로 적용하지 말 것

4. **로그인 오류 가시성**
   - 사용자 문구는 일반화 유지 가능
   - 운영 로그에 OAuth error code를 더 명확히 남기면 재발 대응이 빨라짐

5. **스키마 변경 배포**
   - `--accept-data-loss` 제거 상태 유지
   - 파괴적 스키마 변경이 필요하면 별도 마이그레이션 계획과 수동 승인 후 진행

---

## 9. 결론

이번 세션에서 확인·처리한 핵심은 세 가지입니다.

1. **로그인 실패의 직접 원인**은 Google 설정이 아니라 운영 DB의 깨진 인증 관계였습니다.
2. **기존 가입 데이터/계정 identity**는 백업 기준으로 복구했고, 재가입이 아닌 기존 연결로 되돌렸습니다.
3. **재발 방지**를 위해 배포 스크립트의 데이터 손실 허용을 제거하고, 모바일 첫인상 UI 결함도 수정·배포했습니다.

현재 운영 상태는 인증 가능, 계정 4개 복원, FK 무결성 0, 서비스 active입니다.
