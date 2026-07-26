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

export async function sendContactEmail(input: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const transporter = createTransport();
  const to = process.env.CONTACT_TO || process.env.SMTP_USER;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@ponslink.com";

  await transporter.sendMail({
    from,
    to,
    replyTo: input.email,
    subject: `[이어봄 문의] ${input.subject}`,
    text: [
      `이름: ${input.name}`,
      `이메일: ${input.email}`,
      `제목: ${input.subject}`,
      "",
      input.message,
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;line-height:1.6">
        <h2>이어봄 문의</h2>
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
