import nodemailer from "nodemailer";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";

// ─── SMTP Transport ─────────────────────────────────────────────────────────

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("SMTP is not configured");
  }
  return nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

// ─── Unsubscribe Token ──────────────────────────────────────────────────────
//
// 시크릿은 호출 시점에 읽는다 — 모듈 로드 시점에 캡처하면 dotenv 적용 전후의
// 로드 순서에 따라 서명이 갈라져 이메일의 해지 링크가 서버에서 거부된다.

function unsubscribeSecret(): string {
  return process.env.UNSUBSCRIBE_SECRET || process.env.NEXTAUTH_SECRET || "";
}

export function generateUnsubscribeToken(userId: string): string {
  const hmac = createHmac("sha256", unsubscribeSecret()).update(userId).digest("hex");
  return `${userId}.${hmac}`;
}

export function verifyUnsubscribeToken(token: string): string | null {
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const userId = token.slice(0, dot);
  const hmac = token.slice(dot + 1);
  const expected = createHmac("sha256", unsubscribeSecret()).update(userId).digest("hex");
  if (hmac !== expected) return null;
  return userId;
}

/**
 * 환영 메일 발송 + 중복 방지 + 로그 기록을 하나로 묶는다.
 * 키링 claim이 일어나는 모든 경로(OAuth 신규 가입, OAuth 재로그인, POST claim)에서
 * 이 함수만 호출하면 중복 발송과 로그 누락이 불가능하다.
 */
export async function trySendWelcomeEmail(input: {
  userId: string;
  email: string;
  name: string;
  slug: string;
}): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: input.userId } });
  if (!user?.email || !user.emailNotifications) return false;
  const alreadySent = await db.emailLog.findFirst({
    where: { userId: input.userId, emailType: "welcome" },
  });
  if (alreadySent) return false;

  await db.emailLog.create({
    data: {
      userId: input.userId,
      emailType: "welcome",
      recipient: user.email,
    },
  });

  try {
    await sendWelcomeEmail({ ...input, email: user.email });
    return true;
  } catch (err) {
    // 발송 실패 시 로그를 삭제해 다음 시도에서 재시도 가능하게 한다.
    await db.emailLog.deleteMany({
      where: { userId: input.userId, emailType: "welcome" },
    });
    console.error("welcome email failed", err);
    return false;
  }
}

// ─── Base URL ───────────────────────────────────────────────────────────────

function getBaseUrl(): string {
  return process.env.NEXTAUTH_URL || "https://eobom.ponslink.com";
}

function getFromAddress(): string {
  return process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@ponslink.com";
}

// ─── Email Footer (공통) ────────────────────────────────────────────────────

function emailFooter(unsubscribeToken: string): string {
  const url = getBaseUrl();
  const unsubUrl = `${url}/api/email/unsubscribe?token=${unsubscribeToken}`;
  return `
    <hr style="margin:24px 0;border:none;border-top:1px solid #e0ddd7" />
    <p style="font-size:12px;color:#5c574f;line-height:1.5">
      이 이메일은 <a href="${url}" style="color:#295c3b">이어봄</a>에서 발송했습니다.<br />
      <a href="${unsubUrl}" style="color:#5c574f">알림 구독 해지</a>
    </p>
  `;
}

// ─── Welcome Email ──────────────────────────────────────────────────────────

export async function sendWelcomeEmail(input: {
  userId: string;
  email: string;
  name: string;
  slug: string;
}) {
  const transporter = createTransport();
  const from = getFromAddress();
  const baseUrl = getBaseUrl();
  const journalUrl = `${baseUrl}/j/${input.slug}`;
  const token = generateUnsubscribeToken(input.userId);
  const displayName = input.name || "이어봄 사람";

  await transporter.sendMail({
    from,
    to: input.email,
    subject: "이어봄에 오신 것을 환영합니다",
    text: [
      `안녕하세요, ${displayName}님.`,
      "",
      "키링이 연결되었습니다.",
      "당신만의 묵상 기록 공간이 준비되었습니다.",
      "",
      "지금 바로 첫 기록을 남겨보세요.",
      "성구를 고르지 않아도 됩니다. 오늘 마음에 남은 한 문장이면 충분합니다.",
      "",
      `첫 기록 남기기: ${journalUrl}`,
      "",
      "이 이메일은 키링 연결 알림으로 한 번만 발송됩니다.",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;line-height:1.8;max-width:480px;margin:0 auto;padding:32px 16px">
        <h2 style="font-size:20px;color:#061b0e;margin-bottom:16px">이어봄에 오신 것을 환영합니다</h2>
        <p style="font-size:15px;color:#2d2d2d">안녕하세요, <strong>${escapeHtml(displayName)}</strong>님.</p>
        <p style="font-size:15px;color:#2d2d2d">키링이 연결되었습니다.<br />당신만의 묵상 기록 공간이 준비되었습니다.</p>
        <p style="font-size:15px;color:#2d2d2d">지금 바로 첫 기록을 남겨보세요.<br />성구를 고르지 않아도 됩니다. 오늘 마음에 남은 한 문장이면 충분합니다.</p>
        <a href="${journalUrl}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#061b0e;color:#fbf9f6;text-decoration:none;border-radius:12px;font-size:15px;font-weight:600">첫 기록 남기기</a>
        <p style="font-size:13px;color:#5c574f;margin-top:24px">이 이메일은 키링 연결 알림으로 한 번만 발송됩니다.</p>
        ${emailFooter(token)}
      </div>
    `,
  });
}

// ─── Inactivity Reminder ────────────────────────────────────────────────────

export type ReminderKind = "reminder_3d" | "reminder_7d";

export async function sendInactivityReminder(input: {
  userId: string;
  email: string;
  name: string;
  slug: string;
  kind: ReminderKind;
}) {
  const transporter = createTransport();
  const from = getFromAddress();
  const baseUrl = getBaseUrl();
  const journalUrl = `${baseUrl}/j/${input.slug}`;
  const token = generateUnsubscribeToken(input.userId);
  const displayName = input.name || "이어봄 사람";
  const is3d = input.kind === "reminder_3d";

  const subject = is3d
    ? "작은 기록이 기다리고 있어요"
    : "당신의 목소리가 그리워요";

  const body3d = `
    <p style="font-size:15px;color:#2d2d2d">안녕하세요, <strong>${escapeHtml(displayName)}</strong>님.</p>
    <p style="font-size:15px;color:#2d2d2d">마지막 기록으로부터 3일이 지났습니다.<br />작은 한 문장이면 충분합니다.</p>
    <p style="font-size:15px;color:#2d2d2d">오늘 마음에 남은 것이 있나요?</p>
  `;

  const body7d = `
    <p style="font-size:15px;color:#2d2d2d">안녕하세요, <strong>${escapeHtml(displayName)}</strong>님.</p>
    <p style="font-size:15px;color:#2d2d2d">일주일째 기록이 없습니다.</p>
    <p style="font-size:15px;color:#2d2d2d">기록은 판단이 아니라 기억입니다.</p>
    <p style="font-size:15px;color:#2d2d2d">어제든 그저께든, 마음에 남은 말씀이 있었다면<br />그것만 남겨주세요.</p>
  `;

  const bodyText = is3d
    ? [
        `안녕하세요, ${displayName}님.`,
        "",
        "마지막 기록으로부터 3일이 지났습니다.",
        "작은 한 문장이면 충분합니다.",
        "",
        "오늘 마음에 남은 것이 있나요?",
        `기록 남기기: ${journalUrl}`,
      ].join("\n")
    : [
        `안녕하세요, ${displayName}님.`,
        "",
        "일주일째 기록이 없습니다.",
        "기록은 판단이 아니라 기억입니다.",
        "",
        "어제든 그저께든, 마음에 남은 말씀이 있었다면",
        "그것만 남겨주세요.",
        `기록 남기기: ${journalUrl}`,
      ].join("\n");

  await transporter.sendMail({
    from,
    to: input.email,
    subject,
    text: bodyText,
    html: `
      <div style="font-family:sans-serif;line-height:1.8;max-width:480px;margin:0 auto;padding:32px 16px">
        <h2 style="font-size:20px;color:#061b0e;margin-bottom:16px">${escapeHtml(subject)}</h2>
        ${is3d ? body3d : body7d}
        <a href="${journalUrl}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#061b0e;color:#fbf9f6;text-decoration:none;border-radius:12px;font-size:15px;font-weight:600">기록 남기기</a>
        ${emailFooter(token)}
      </div>
    `,
  });
}

// ─── Weekly Digest ──────────────────────────────────────────────────────────

export async function sendWeeklyDigest(input: {
  userId: string;
  email: string;
  name: string;
  slug: string;
  teamSize: number;
  weekRecordCount: number;
  hasOwnRecord: boolean;
  topScripture?: string | null;
}) {
  const transporter = createTransport();
  const from = getFromAddress();
  const baseUrl = getBaseUrl();
  const journalUrl = `${baseUrl}/j/${input.slug}`;
  const token = generateUnsubscribeToken(input.userId);
  const displayName = input.name || "이어봄 사람";

  const statsLine = input.weekRecordCount > 0
    ? `${input.teamSize}명이 ${input.weekRecordCount}개의 기록을 남겼습니다.`
    : "아직 이번 주 기록이 없습니다.";

  const scriptureLine = input.topScripture
    ? `<p style="font-size:15px;color:#2d2d2d">가장 많이 머문 말씀: <strong>${escapeHtml(input.topScripture)}</strong></p>`
    : "";

  const ctaText = input.hasOwnRecord
    ? "이번 주도 기록을 이어가세요"
    : "한 문장이면 됩니다";

  await transporter.sendMail({
    from,
    to: input.email,
    subject: "이번 주 이어봄 이야기",
    text: [
      `안녕하세요, ${displayName}님.`,
      "",
      "이번 주 이어봄에서는",
      statsLine,
      input.topScripture ? `가장 많이 머문 말씀: ${input.topScripture}` : "",
      "",
      ctaText,
      `기록 남기기: ${journalUrl}`,
    ].filter(Boolean).join("\n"),
    html: `
      <div style="font-family:sans-serif;line-height:1.8;max-width:480px;margin:0 auto;padding:32px 16px">
        <h2 style="font-size:20px;color:#061b0e;margin-bottom:16px">이번 주 이어봄 이야기</h2>
        <p style="font-size:15px;color:#2d2d2d">안녕하세요, <strong>${escapeHtml(displayName)}</strong>님.</p>
        <p style="font-size:15px;color:#2d2d2d">이번 주 이어봄에서는</p>
        <p style="font-size:15px;color:#2d2d2d"><strong>${statsLine}</strong></p>
        ${scriptureLine}
        <a href="${journalUrl}" style="display:inline-block;margin:20px 0;padding:14px 28px;background:#061b0e;color:#fbf9f6;text-decoration:none;border-radius:12px;font-size:15px;font-weight:600">${escapeHtml(ctaText)}</a>
        ${emailFooter(token)}
      </div>
    `,
  });
}

// ─── Admin Report ───────────────────────────────────────────────────────────

export async function sendAdminReport(input: {
  adminEmail: string;
  totalUsers: number;
  weekRecordCount: number;
  newUsers: number;
  inactive7d: number;
  weekStart: string;
  weekEnd: string;
}) {
  const transporter = createTransport();
  const from = getFromAddress();

  await transporter.sendMail({
    from,
    to: input.adminEmail,
    subject: `[주간 리포트] ${input.weekStart} ~ ${input.weekEnd}`,
    text: [
      `[주간 리포트] ${input.weekStart} ~ ${input.weekEnd}`,
      "",
      `총 사용자: ${input.totalUsers}명`,
      `이번 주 기록: ${input.weekRecordCount}건`,
      `신규 가입: ${input.newUsers}명`,
      `미기록 7일 이상: ${input.inactive7d}명`,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;line-height:1.8;max-width:480px;margin:0 auto;padding:32px 16px">
        <h2 style="font-size:20px;color:#061b0e;margin-bottom:16px">주간 리포트</h2>
        <p style="font-size:13px;color:#5c574f">${escapeHtml(input.weekStart)} ~ ${escapeHtml(input.weekEnd)}</p>
        <table style="font-size:15px;color:#2d2d2d;border-collapse:collapse;width:100%;margin-top:16px">
          <tr><td style="padding:8px 0;border-bottom:1px solid #e0ddd7">총 사용자</td><td style="padding:8px 0;border-bottom:1px solid #e0ddd7;text-align:right"><strong>${input.totalUsers}명</strong></td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e0ddd7">이번 주 기록</td><td style="padding:8px 0;border-bottom:1px solid #e0ddd7;text-align:right"><strong>${input.weekRecordCount}건</strong></td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #e0ddd7">신규 가입</td><td style="padding:8px 0;border-bottom:1px solid #e0ddd7;text-align:right"><strong>${input.newUsers}명</strong></td></tr>
          <tr><td style="padding:8px 0">미기록 7일 이상</td><td style="padding:8px 0;text-align:right"><strong>${input.inactive7d}명</strong></td></tr>
        </table>
      </div>
    `,
  });
}

const CATEGORY_LABEL: Record<string, string> = {
  feature: "기능 추가",
  redesign: "개편",
  improve: "개선",
  other: "기타",
};

export async function sendContactEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
  kind?: "contact" | "suggest";
  category?: string | null;
}) {
  const transporter = createTransport();
  const to = process.env.CONTACT_TO || process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@ponslink.com";
  const isSuggest = input.kind === "suggest";
  const categoryLabel = input.category
    ? CATEGORY_LABEL[input.category] || input.category
    : null;
  const prefix = isSuggest ? "이어봄 제안" : "이어봄 문의";
  const subjectLine = categoryLabel
    ? `[${prefix}] [${categoryLabel}] ${input.subject}`
    : `[${prefix}] ${input.subject}`;

  await transporter.sendMail({
    from,
    to,
    replyTo: input.email,
    subject: subjectLine,
    text: [
      `종류: ${isSuggest ? "제안" : "문의"}`,
      categoryLabel ? `카테고리: ${categoryLabel}` : null,
      `이름: ${input.name}`,
      `이메일: ${input.email}`,
      `제목: ${input.subject}`,
      "",
      input.message,
    ]
      .filter(Boolean)
      .join("\n"),
    html: `
      <div style="font-family:sans-serif;line-height:1.6">
        <h2>${escapeHtml(prefix)}</h2>
        <p><strong>종류:</strong> ${isSuggest ? "제안" : "문의"}</p>
        ${
          categoryLabel
            ? `<p><strong>카테고리:</strong> ${escapeHtml(categoryLabel)}</p>`
            : ""
        }
        <p><strong>이름:</strong> ${escapeHtml(input.name)}</p>
        <p><strong>이메일:</strong> ${escapeHtml(input.email)}</p>
        <p><strong>제목:</strong> ${escapeHtml(input.subject)}</p>
        <hr />
        <p>${escapeHtml(input.message).replace(/\n/g, "<br/>")}</p>
      </div>
    `,
  });
}

// ─── Daily Scripture Email ──────────────────────────────────────────────────

export async function sendDailyScriptureEmail(input: {
  userId: string;
  email: string;
  name: string;
  path: "ai" | "random";
  display: string;
  text: string;
  background: string;
  why?: string;
  theme?: string;
}) {
  const transporter = createTransport();
  const from = getFromAddress();
  const baseUrl = getBaseUrl();
  const token = generateUnsubscribeToken(input.userId);
  const displayName = input.name || "이어봄 사람";
  const writeUrl = `${baseUrl}/entries/new?scripture=${encodeURIComponent(input.display)}`;
  const isAi = input.path === "ai";

  const subject = isAi
    ? `오늘, ${input.display} — 기록이 가리킨 자리`
    : `오늘의 말씀 — ${input.display}`;

  const themeLine =
    isAi && input.theme
      ? `최근 기록에서 ‘${input.theme}’의 결이 자주 보였습니다.\n그래서 오늘 이 본문을 권합니다.`
      : "오늘 머무를 말씀입니다.";

  const whyBlock =
    isAi && input.why
      ? ["", "— 왜 이 본문인지 —", input.why]
      : [];

  const ctaHint = isAi
    ? "이 본문은 처방이 아니라 머무를 자리입니다."
    : "기록을 남기기 시작하면, 당신의 기록에 맞는 본문을 골라 드립니다.";

  const textBody = [
    `안녕하세요, ${displayName}님.`,
    "",
    themeLine,
    "",
    input.display,
    `"${input.text}"`,
    "",
    "— 배경 —",
    input.background,
    ...whyBlock,
    "",
    `이 본문으로 기록하기: ${writeUrl}`,
    "",
    ctaHint,
    "",
    "이 이메일은 묵상 자료이며, 성경의 최종 해석을 대신하지 않습니다.",
  ].join("\n");

  const whyHtml =
    isAi && input.why
      ? `<p style="font-size:13px;color:#5c574f;margin:16px 0 4px">— 왜 이 본문인지 —</p>
        <p style="font-size:15px;color:#2d2d2d">${escapeHtml(input.why)}</p>`
      : "";

  const themeHtml = isAi && input.theme
    ? `<p style="font-size:15px;color:#2d2d2d">최근 기록에서 ‘${escapeHtml(input.theme)}’의 결이 자주 보였습니다.<br />그래서 오늘 이 본문을 권합니다.</p>`
    : `<p style="font-size:15px;color:#2d2d2d">오늘 머무를 말씀입니다.</p>`;

  await transporter.sendMail({
    from,
    to: input.email,
    subject,
    text: textBody,
    html: `
      <div style="font-family:sans-serif;line-height:1.8;max-width:480px;margin:0 auto;padding:32px 16px">
        <h2 style="font-size:20px;color:#061b0e;margin-bottom:16px">${escapeHtml(subject)}</h2>
        <p style="font-size:15px;color:#2d2d2d">안녕하세요, <strong>${escapeHtml(displayName)}</strong>님.</p>
        ${themeHtml}
        <p style="font-size:16px;color:#061b0e;font-weight:600;margin:24px 0 8px">${escapeHtml(input.display)}</p>
        <p style="font-size:15px;color:#2d2d2d;font-style:italic;border-left:3px solid #c5a059;padding-left:12px">“${escapeHtml(input.text)}”</p>
        <p style="font-size:13px;color:#5c574f;margin:20px 0 4px">— 배경 —</p>
        <p style="font-size:15px;color:#2d2d2d">${escapeHtml(input.background)}</p>
        ${whyHtml}
        <a href="${writeUrl}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#061b0e;color:#fbf9f6;text-decoration:none;border-radius:12px;font-size:15px;font-weight:600">이 본문으로 기록하기</a>
        <p style="font-size:13px;color:#5c574f">${escapeHtml(ctaHint)}</p>
        <p style="font-size:12px;color:#5c574f;margin-top:16px">이 이메일은 묵상 자료이며, 성경의 최종 해석을 대신하지 않습니다.</p>
        ${emailFooter(token)}
      </div>
    `,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
