# 이메일 알림 시스템 설계

- 버전: v1.0
- 작성일: 2026-08-03
- 상태: **구현 완료**
- 관련: `src/lib/mail.ts`, `src/lib/seats.ts`, `src/lib/entries.ts`, Prisma 스키마

---

## 0. 목적

이어봄 키링 사용자의 묵상 기록 지속성을 높이기 위한 이메일 알림 시스템을 설계한다.
알림은 **최소한으로**, 사용자 피로도를 줄이면서 **기록 동기**를 부여하는 데 초점을 맞춘다.

---

## 1. 설계 원칙

| 원칙 | 설명 |
|---|---|
| **본인에게만** | 타인의 기록 알림은 이메일로 보내지 않는다 |
| **최소 빈도** | 한 사람당 주 1~2통 이내 |
| **리마인더 중심** | "기록하세요"가 아니라 "기록이 기다리고 있어요" |
| **즉시 퇴출 가능** | 모든 이메일에 구독 해지 링크 포함 |
| **무료 SMTP 한도 준수** | Gmail 기준 500건/일, 14명 기준 여유 |

---

## 2. 알림 유형

### 2.1 환영 메일 (Welcome Email)

| 항목 | 내용 |
|---|---|
| **발송 시점** | 키링 claim 완료 직후 (동기) |
| **받는 사람** | claim한 사용자 본인 |
| **발송 빈도** | 1회만 |
| **목적** | 키링 연결 확인 + 첫 기록 유도 |

**제목:** 이어봄에 오신 것을 환영합니다

**본문:**
```
안녕하세요, {이름}님.

키링이 연결되었습니다.
당신만의 묵상 기록 공간이 준비되었습니다.

지금 바로 첫 기록을 남겨보세요.
성구不必, 오늘 마음에 남은 한 문장이면 충분합니다.

→ 첫 기록 남기기: {개인URL}

이 이메일은 키링 연결 알림으로 한 번만 발송됩니다.
```

---

### 2.2 미기록 리마인더 (Inactivity Reminder)

| 항목 | 내용 |
|---|---|
| **발송 시점** | 마지막 기록 후 3일, 7일 경과 시 |
| **받는 사람** | 미기록 사용자 본인만 |
| **발송 빈도** | 3일차 1통 + 7일차 1통 (최대 2통) |
| **목적** | 기록 습관 유지를 위한 부드러운 상기 |

**조건:**
- `lastRecordedAt`이 3일 이상 경과한 사용자
- 같은 주期内 중복 발송 안 함 (월요일 일괄)
- 이미 리마인더를 받은 사람은 7일차까지 추가 발송 안 함

**제목 (3일차):** 작은 기록이 기다리고 있어요

**본문:**
```
안녕하세요, {이름}님.

마지막 기록으로부터 3일이 지났습니다.
작은 한 문장이면 충분합니다.

오늘 마음에 남은 것이 있나요?
→ 기록 남기기: {개인URL}
```

**제목 (7일차):** 당신의 목소리가 그리워요

**본문:**
```
안녕하세요, {이름}님.

일주일째 기록이 없습니다.
기록은 판단이 아니라 기억입니다.

어제든 그저께든, 마음에 남은 말씀이 있었다면
그것만 남겨주세요.

→ 기록 남기기: {개인URL}
```

---

### 2.3 주간 요약 (Weekly Digest)

| 항목 | 내용 |
|---|---|
| **발송 시점** | 매주 일요일 저녁 (8시) |
| **받는 사람** | 이어봄 가입 사용자 전원 |
| **발송 빈도** | 주 1회 |
| **목적** | 팀 전체 활동 파악 + 기록 동기 부여 |

**제목:** 이번 주 이어봄 이야기

**본문:**
```
안녕하세요, {이름}님.

이번 주 이어봄에서는
{팀원수}명이 {기록수}개의 기록을 남겼습니다.

{기록이 있는 경우}
가장 많이 머문 말씀: {자주 등장한 성구}

{기록이 없는 경우}
아직 이번 주 기록이 없습니다.
한 문장이면 됩니다.

→ 기록 남기기: {개인URL}
```

**조건:**
- 팀 수준 집계 (개인별 노출 안 함)
- 기록 수, 성구 통계만 포함
- "누가 기록했는지" 노출 금지 (프라이버시)

---

### 2.4 관리자 리포트 (Admin Report)

| 항목 | 내용 |
|---|---|
| **발송 시점** | 매주 일요일 저녁 (요약과 함께) |
| **받는 사람** | `ADMIN_EMAILS`에 등록된 관리자 |
| **발송 빈도** | 주 1회 |
| **목적** | 팀 활동 모니터링 |

**본문:**
```
[주간 리포트] {날짜}

총 사용자: {N}명
이번 주 기록: {M}건
신규 가입: {K}명
미기록 7일 이상: {X}명

상세: {관리자 URL}
```

---

## 3. 발송 조건

### 3.1 발송 로직

```typescript
// 환영 메일: claim 완료 시점에서 동기 발송
async function sendWelcomeEmail(user: { email: string; name: string; slug: string }) {
  // claimSeat 완료 후 즉시 호출
}

// 미기록 리마인더: 매일 자정 배치 작업
async function sendInactivityReminders() {
  // 1. lastRecordedAt >= 3일 전 사용자 조회
  // 2. 같은 주에 이미 리마인더를 보낸 사용자 제외
  // 3. 리마인더 이력 테이블 확인
  // 4. 발송
}

// 주간 요약: 매주 일요일 20:00 배치 작업
async function sendWeeklyDigest() {
  // 1. 이번 주 기록 수 집계
  // 2. 팀 통계 생성
  // 3. 전체 사용자에게 발송
}
```

### 3.2 배치 작업 구현

**방안 A: cron 스크립트 (추천)**
```
scripts/
  email-batch.ts    # 매일 자정 실행
  email-digest.ts   # 매주 일요일 20:00 실행
```

systemd timer 또는 cron으로 서버에서 실행.

**방안 B: Next.js API Route + 외부 호출**
- Vercel Cron / 외부 스케줄러가 API 호출
- 현재 배포는 self-hosted (systemd)이므로 방안 A가 적합

---

## 4. 데이터 모델

### 4.1 이메일 발송 이력 테이블

```prisma
model EmailLog {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  emailType   String   // "welcome" | "reminder_3d" | "reminder_7d" | "weekly_digest" | "admin_report"
  sentAt      DateTime @default(now())
  recipient   String   // 수신 이메일

  @@index([userId, emailType])
  @@index([sentAt])
}
```

### 4.2 User 테이블 확장

```prisma
model User {
  // ... 기존 필드
  lastRecordedAt     DateTime?   // 마지막 묵상 기록 시간
  emailNotifications Boolean  @default(true)  // 이메일 수신 동의
}
```

---

## 5. 구독 관리

### 5.1 이메일 하단 공통

```
이 이메일은 이어봄에서 발송했습니다.
구독 해지: {구독해지URL}
```

### 5.2 구독 해지 API

```
GET /api/email/unsubscribe?token={token}
```

- 토큰 = userId + salt의 HMAC
- `emailNotifications`를 `false`로 변경
- 해지 완료 페이지 표시

### 5.3 재구독

`/me/settings`에서 이메일 알림 다시 켜기

---

## 6. SMTP 설정

현재 `mail.ts`의 SMTP 인프라를 그대로 사용한다.

**환경 변수:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=app-password
SMTP_FROM=이어봄 <noreply@ponslink.com>
```

**Gmail 기준:**
- 일일 발송 한도: 500건
- 14명 × 주간 요약 14건 + 리마인더 ~10건 = **24건/주**
- 여유 충분

---

## 7. 구현 완료

| 단계 | 내용 | 파일 |
|---|---|---|
| 1 | `EmailLog` 테이블 + User 스키마 확장 | `prisma/schema.prisma` |
| 2 | `sendWelcomeEmail` 구현 | `src/lib/mail.ts` |
| 3 | `sendInactivityReminder` 구현 | `src/lib/mail.ts` |
| 4 | `sendWeeklyDigest` 구현 | `src/lib/mail.ts` |
| 5 | `sendAdminReport` 구현 | `src/lib/mail.ts` |
| 6 | 구독 해지 토큰 유틸 | `src/lib/mail.ts` |
| 7 | claim 완료 시 환영 메일 발송 | `src/app/api/seats/claim/route.ts` |
| 8 | 기록 저장 시 lastRecordedAt 업데이트 | `src/lib/entries.ts` |
| 9 | 미기록 리마인더 배치 스크립트 | `scripts/email-batch.ts` |
| 10 | 주간 요약 배치 스크립트 | `scripts/email-digest.ts` |
| 11 | 구독 해지 API | `src/app/api/email/unsubscribe/route.ts` |
| 12 | 구독 해지 완료 페이지 | `src/app/email-unsubscribed/page.tsx` |
| 13 | 단위 테스트 | `tests/email.test.ts` |

**남은 작업:** systemd timer 등록 + SMTP 환경 변수 설정

---

## 8. 테스트 계획

| 테스트 | 내용 |
|---|---|
| 환영 메일 | claim 후 이메일 도착 확인 |
| 리마인더 조건 | 3일/7일 경과 시 발송 확인 |
| 리마인더 중복 방지 | 같은 주 2회 발송 안 되는지 |
| 주간 요약 | 통계 집계 정확성 |
| 구독 해지 | 토큰 검증 + DB 반영 |
| SMTP 실패 | 전송 실패 시 로그만 남기고 에러 안 터지는지 |

---

## 9. 제외 대상

- 이메일 미입력 사용자 (Google 계정에 이메일 없는 경우)
- `emailNotifications = false` 사용자
- 관리자 리포트는 `ADMIN_EMAILS`에 등록된 사람에게만

---

## 10. 확장 검토 (v2)

| 기능 | 설명 | 우선순위 |
|---|---|---|
| 누가 기록했는지 알림 | 팀 내 사회적 증거 (단, 익명) | 중 |
| 특정 성구 관련 알림 | "이 성구를 다른 팀원도 묵상했어요" | 낮 |
| 기도 요청 알림 | "팀원이 기도 제목을 공유했습니다" | 낮 |
| 카카오톡 연동 | 이메일 대신 카카오톡 발송 | 중 |

---

## 11. 리스크

| 리스크 | 대응 |
|---|---|
| 스팸신고 | 구독 해지 링크 명시 + 발송 빈도 엄수 |
| SMTP 차단 | Gmail 앱 비밀번호 사용 + 에러 모니터링 |
| 프라이버시 | 주간 요약에 개인 노출 없음, 팀 수준 통계만 |
| 사용자 무시 | 리마인더 2회 후 중단 (이메일 피로 방지) |
