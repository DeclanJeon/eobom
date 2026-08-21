#!/usr/bin/env bun
/**
 * 이메일 배치 작업 — 오늘의 묵상 성구
 *
 * cron (KST 매일 07:00):
 *   CRON_TZ=Asia/Seoul
 *   0 7 * * * flock -n /tmp/eobom-email-daily.lock bun run scripts/email-daily.ts
 *
 * 플래그:
 *   --dry-run                 발송 없이 선택 결과만 출력
 *   --to=email@example.com    실발송 스모크 (EmailLog 미기록)
 */

import { db } from "../src/lib/db";
import {
  selectDailyScripture,
  toKstParts,
} from "../src/lib/daily-scripture";
import { sendDailyScriptureEmail, type DailyEmailMetaNote } from "../src/lib/mail";

const GMAIL_DAILY_LIMIT = 500;
const SMTP_FAIL_BREAK = 3;
const LOOKBACK_DAYS = 90;
const RECENT_EMAIL_DAYS = 14;

function parseArgs(argv: string[]) {
  let dryRun = false;
  let to: string | null = null;
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--to=")) to = a.slice("--to=".length).trim() || null;
  }
  if (dryRun && to) {
    console.error("--dry-run 과 --to 는 동시에 사용할 수 없습니다.");
    process.exit(1);
  }
  return { dryRun, to };
}

async function loadRecentEmailSlugs(userId: string, since: Date): Promise<string[]> {
  const logs = await db.emailLog.findMany({
    where: {
      userId,
      emailType: "daily_scripture",
      sentAt: { gte: since },
      meta: { not: null },
    },
    select: { meta: true },
  });
  return logs.map((l) => l.meta).filter((m): m is string => Boolean(m));
}

async function loadRecentEntries(userId: string, since: Date) {
  return db.reflectionEntry.findMany({
    where: {
      userId,
      deletedAt: null,
      entryDate: { gte: since },
    },
    orderBy: { entryDate: "desc" },
    take: 20,
    select: {
      reflectionBody: true,
      scriptureBindings: true,
      scriptureRefs: true,
      emotions: true,
      tags: true,
      entryDate: true,
    },
  });
}

async function alreadySentToday(userId: string, dayStart: Date): Promise<boolean> {
  const row = await db.emailLog.findFirst({
    where: {
      userId,
      emailType: "daily_scripture",
      sentAt: { gte: dayStart },
    },
    select: { id: true },
  });
  return Boolean(row);
}

function kstDayStart(now: Date): Date {
  const kst = toKstParts(now);
  // KST 00:00 = UTC previous day 15:00
  return new Date(Date.UTC(kst.year, kst.month - 1, kst.day, -9, 0, 0, 0));
}

async function processUser(opts: {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
    name: string | null;
    aiProcessingConsent: boolean;
  };
  now: Date;
  dryRun: boolean;
  toOverride: string | null;
  skipLog: boolean;
}): Promise<"sent" | "skipped" | "failed"> {
  const { user, now, dryRun, toOverride, skipLog } = opts;
  if (!user.email) return "skipped";

  const dayStart = kstDayStart(now);
  if (!skipLog && (await alreadySentToday(user.id, dayStart))) {
    return "skipped";
  }
  // 매일 07:00 cron 1회 실행. 이미 오늘 보낸 사용자만 skip.

  const lookback = new Date(now.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const recentSince = new Date(now.getTime() - RECENT_EMAIL_DAYS * 24 * 60 * 60 * 1000);
  const [entries, recentSlugs] = await Promise.all([
    loadRecentEntries(user.id, lookback),
    loadRecentEmailSlugs(user.id, recentSince),
  ]);

  const kst = toKstParts(now);
  const selected = await selectDailyScripture({
    userId: user.id,
    dateKey: kst.dateKey,
    aiProcessingConsent: user.aiProcessingConsent,
    entries,
    recentEmailSlugs: recentSlugs,
  });

  const recipient = toOverride || user.email;
  const name = user.displayName || user.name || "";

  // GATE-4: 개인 요소는 메타 카피만 (원문·excerpt 금지). 카드가 실제로 기록을
  // 사용하는 AI 경로에서만 부착 — 랜덤 경로는 기록과 무관하므로 주장하지 않는다 (QA-1).
  const recentEntry = entries.find(
    (e) => e.entryDate.getTime() >= now.getTime() - 2 * 24 * 60 * 60 * 1000,
  );
  const metaNote: DailyEmailMetaNote | undefined =
    selected.path === "ai"
      ? recentEntry
        ? "최근 남긴 기록이 오늘 카드로 이어졌습니다."
        : entries.length > 0
          ? "남긴 기록이 오늘의 카드에 이어집니다."
          : undefined
      : undefined;

  if (dryRun) {
    console.log(
      `  [dry-run] ${user.email} → ${selected.path} ${selected.display} (${selected.slug})${metaNote ? " +meta" : ""}`,
    );
    return "sent";
  }

  // create-before-send (정식 경로만 로그)
  let logId: string | null = null;
  if (!skipLog) {
    const log = await db.emailLog.create({
      data: {
        userId: user.id,
        emailType: "daily_scripture",
        recipient,
        meta: selected.slug,
      },
    });
    logId = log.id;
  }

  try {
    await sendDailyScriptureEmail({
      userId: user.id,
      email: recipient,
      name,
      path: selected.path,
      display: selected.display,
      text: selected.text,
      background: selected.background,
      why: selected.why,
      theme: selected.theme,
      metaNote,
    });
    console.log(
      `  → ${recipient} (${selected.path}) ${selected.display}${skipLog ? " [smoke]" : ""}`,
    );
    return "sent";
  } catch (err) {
    if (logId) {
      await db.emailLog.delete({ where: { id: logId } }).catch(() => {});
    }
    console.error(`  ✗ ${recipient}: ${err}`);
    return "failed";
  }
}

async function main() {
  const { dryRun, to } = parseArgs(process.argv.slice(2));
  const now = new Date();
  const kst = toKstParts(now);
  console.log(
    `[email-daily] 시작: ${kst.dateKey} ${String(kst.hour).padStart(2, "0")}:${String(kst.minute).padStart(2, "0")} KST${dryRun ? " (dry-run)" : ""}${to ? ` (to=${to})` : ""}`,
  );

  // SMTP 잔여 한도 점검 (정식 경로)
  if (!dryRun && !to) {
    const dayStart = kstDayStart(now);
    const sentToday = await db.emailLog.count({
      where: { emailType: "daily_scripture", sentAt: { gte: dayStart } },
    });
    const remaining = GMAIL_DAILY_LIMIT - sentToday;
    if (remaining <= 0) {
      console.log(`[email-daily] SMTP 일 한도 소진 (${sentToday}/${GMAIL_DAILY_LIMIT}). 종료.`);
      return;
    }
    console.log(`[email-daily] 금일 발송 ${sentToday}건, 잔여 약 ${remaining}건`);
  }

  if (to) {
    const user = await db.user.findFirst({
      where: { email: to, deletedAt: null },
      select: {
        id: true,
        email: true,
        displayName: true,
        name: true,
        aiProcessingConsent: true,
      },
    });
    if (!user) {
      console.error(`[email-daily] 사용자를 찾을 수 없습니다: ${to}`);
      process.exit(1);
    }
    const result = await processUser({
      user,
      now,
      dryRun: false,
      toOverride: to,
      skipLog: true,
    });
    console.log(`[email-daily] 스모크 완료: ${result}`);
    if (result === "failed") process.exit(1);
    return;
  }

  const users = await db.user.findMany({
    where: {
      emailNotifications: true,
      claimedSeat: { isNot: null },
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      name: true,
      aiProcessingConsent: true,
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let consecutiveFails = 0;

  for (const user of users) {
    const result = await processUser({
      user,
      now,
      dryRun,
      toOverride: null,
      skipLog: dryRun,
    });
    if (result === "sent") {
      sent++;
      consecutiveFails = 0;
    } else if (result === "skipped") {
      skipped++;
    } else {
      failed++;
      consecutiveFails++;
      if (!dryRun && consecutiveFails >= SMTP_FAIL_BREAK) {
        console.error(
          `[email-daily] SMTP 연속 실패 ${SMTP_FAIL_BREAK}회 — 서킷 브레이크 발동. 종료.`,
        );
        break;
      }
    }
  }

  console.log(
    `[email-daily] 완료: 발송 ${sent}건, 건너뜀 ${skipped}건, 실패 ${failed}건`,
  );
}

main()
  .catch((err) => {
    console.error("[email-daily] 치명적 오류:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
