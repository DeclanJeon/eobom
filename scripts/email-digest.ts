#!/usr/bin/env bun
/**
 * 이메일 배치 작업 — 주간 요약
 *
 * 매주 일요일 20:00에 실행:
 *   bun run scripts/email-digest.ts
 *
 * 각 사용자에게 이번 주 팀 활동 요약을 발송한다.
 * 관리자에게는 주간 리포트를 추가 발송한다.
 */

import { db } from "../src/lib/db";
import { sendWeeklyDigest, sendAdminReport } from "../src/lib/mail";

function getWeekRange(date: Date): { start: Date; end: Date; startStr: string; endStr: string } {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: monday,
    end: sunday,
    startStr: monday.toISOString().slice(0, 10),
    endStr: sunday.toISOString().slice(0, 10),
  };
}

async function main() {
  const now = new Date();
  const { start, end, startStr, endStr } = getWeekRange(now);

  console.log(`[email-digest] 시작: ${startStr} ~ ${endStr}`);

  // 이번 주 기록 수 집계
  const weekRecordCount = await db.reflectionEntry.count({
    where: {
      createdAt: { gte: start, lte: end },
      deletedAt: null,
    },
  });

  // 총 사용자 수
  const totalUsers = await db.user.count({
    where: { deletedAt: null, claimedSeat: { isNot: null } },
  });

  // 신규 가입 (이번 주 claim한 사용자)
  const newUsers = await db.user.count({
    where: {
      seatClaimedAt: { gte: start, lte: end },
      deletedAt: null,
    },
  });

  // 7일 이상 미기록 사용자
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const inactive7d = await db.user.count({
    where: {
      deletedAt: null,
      claimedSeat: { isNot: null },
      OR: [
        { lastRecordedAt: null },
        { lastRecordedAt: { lt: sevenDaysAgo } },
      ],
    },
  });

  // 가장 많이 등장한 성구 (간단 통계)
  const topScripture = await db.reflectionEntry.groupBy({
    by: ["scriptureRefs"],
    where: {
      createdAt: { gte: start, lte: end },
      deletedAt: null,
      scriptureRefs: { not: "[]" },
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });
  const topScriptureRef = topScripture[0]?.scriptureRefs
    ? JSON.parse(topScripture[0].scriptureRefs as string)[0] || null
    : null;

  // 이메일 알림에 동의한 사용자에게 주간 요약 발송
  const users = await db.user.findMany({
    where: {
      emailNotifications: true,
      claimedSeat: { isNot: null },
      deletedAt: null,
    },
    include: {
      claimedSeat: { select: { slug: true } },
      reflectionEntries: {
        where: {
          createdAt: { gte: start, lte: end },
          deletedAt: null,
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  let sent = 0;

  for (const user of users) {
    if (!user.email || !user.claimedSeat?.slug) continue;

    try {
      await sendWeeklyDigest({
        userId: user.id,
        email: user.email,
        name: user.displayName || user.name || "",
        slug: user.claimedSeat.slug,
        teamSize: totalUsers,
        weekRecordCount,
        hasOwnRecord: user.reflectionEntries.length > 0,
        topScripture: topScriptureRef,
      });

      await db.emailLog.create({
        data: {
          userId: user.id,
          emailType: "weekly_digest",
          recipient: user.email,
        },
      });

      sent++;
    } catch (err) {
      console.error(`  ✗ ${user.email}: ${err}`);
    }
  }

  console.log(`[email-digest] 요약 발송: ${sent}건`);

  // 관리자 리포트 발송
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  for (const adminEmail of adminEmails) {
    try {
      await sendAdminReport({
        adminEmail,
        totalUsers,
        weekRecordCount,
        newUsers,
        inactive7d,
        weekStart: startStr,
        weekEnd: endStr,
      });
      console.log(`  → 관리자 리포트: ${adminEmail}`);
    } catch (err) {
      console.error(`  ✗ 관리자 리포트 ${adminEmail}: ${err}`);
    }
  }

  console.log(`[email-digest] 완료`);
}

main()
  .catch((err) => {
    console.error("[email-digest] 치명적 오류:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
