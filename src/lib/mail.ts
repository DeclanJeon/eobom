import nodemailer from "nodemailer";

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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
