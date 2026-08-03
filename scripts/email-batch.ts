#!/usr/bin/env bun
/**
 * 이메일 배치 작업 — 미기록 리마인더
 *
 * 매일 자정에 실행:
 *   bun run scripts/email-batch.ts
 *
 * 3일차/7일차 미기록 사용자에게 리마인더 이메일을 발송한다.
 * 같은 주에 중복 발송하지 않는다.
 */

import { db } from "../src/lib/db";
import { sendInactivityReminder, type ReminderKind } from "../src/lib/mail";

function getWeekKey(date: Date): string {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

async function main() {
  const now = new Date();
  const weekKey = getWeekKey(now);
  const today = now.toISOString().slice(0, 10);

  console.log(`[email-batch] 시작: ${today} (주차: ${weekKey})`);

  // 최근 24시간 내 일일 이메일을 받은 사용자는 리마인더 억제 (N1)
  const suppressSince = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // 이메일 알림에 동의한 사용자 중, 키링이 연결된 사용자만
  const users = await db.user.findMany({
    where: {
      emailNotifications: true,
      claimedSeat: { isNot: null },
      deletedAt: null,
      // 최근 24시간 내 daily_scripture 수신자 제외
      NOT: {
        emailLogs: {
          some: {
            emailType: "daily_scripture",
            sentAt: { gte: suppressSince },
          },
        },
      },
    },
    include: {
      claimedSeat: { select: { slug: true } },
      emailLogs: {
        where: {
          emailType: { in: ["reminder_3d", "reminder_7d"] },
          sentAt: {
            gte: new Date(`${weekKey}T00:00:00Z`),
          },
        },
        select: { emailType: true },
      },
    },
  });

  let sent3d = 0;
  let sent7d = 0;
  let skipped = 0;

  for (const user of users) {
    if (!user.email || !user.claimedSeat?.slug) {
      skipped++;
      continue;
    }

    // 이미 이번 주에 리마인더를 보냈는지 확인
    const sentTypes = new Set(user.emailLogs.map((l) => l.emailType));
    if (sentTypes.has("reminder_3d") || sentTypes.has("reminder_7d")) {
      skipped++;
      continue;
    }

    const lastRecorded = user.lastRecordedAt;
    const daysSinceLastRecord = lastRecorded
      ? Math.floor((now.getTime() - lastRecorded.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let kind: ReminderKind | null = null;

    if (daysSinceLastRecord === null || daysSinceLastRecord >= 7) {
      kind = "reminder_7d";
    } else if (daysSinceLastRecord >= 3) {
      kind = "reminder_3d";
    }

    if (!kind) {
      skipped++;
      continue;
    }

    try {
      await sendInactivityReminder({
        userId: user.id,
        email: user.email,
        name: user.displayName || user.name || "",
        slug: user.claimedSeat.slug,
        kind,
      });

      await db.emailLog.create({
        data: {
          userId: user.id,
          emailType: kind,
          recipient: user.email,
        },
      });

      if (kind === "reminder_3d") sent3d++;
      else sent7d++;

      console.log(`  → ${user.email} (${kind})`);
    } catch (err) {
      console.error(`  ✗ ${user.email}: ${err}`);
    }
  }

  console.log(`[email-batch] 완료: 3일차 ${sent3d}건, 7일차 ${sent7d}건, 건너뜀 ${skipped}건`);
}

main()
  .catch((err) => {
    console.error("[email-batch] 치명적 오류:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
