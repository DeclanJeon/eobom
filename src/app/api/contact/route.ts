import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { sendContactEmail } from "@/lib/mail";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedBody,
} from "@/lib/rate-limit";
import { contactSchema, parseJsonBody } from "@/lib/api-schemas";

const SUGGEST_CATEGORIES = new Set([
  "feature",
  "redesign",
  "improve",
  "other",
]);

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, contactSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const name = body.name?.trim() || "";
    const email = body.email?.trim() || "";
    const subject = body.subject?.trim() || "";
    const message = body.message?.trim() || "";
    const kind = body.kind === "suggest" ? "suggest" : "contact";
    const category =
      kind === "suggest" &&
      body.category &&
      SUGGEST_CATEGORIES.has(body.category)
        ? body.category
        : null;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        {
          error:
            kind === "suggest"
              ? "이름, 이메일, 한 줄 요약, 내용을 모두 입력해 주세요."
              : "이름, 이메일, 제목, 내용을 모두 입력해 주세요.",
        },
        { status: 400 },
      );
    }
    if (kind === "suggest" && !category) {
      return NextResponse.json(
        { error: "제안 종류(기능 추가·개편·개선·기타)를 선택해 주세요." },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "이메일 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    const session = await getSession();
    const rateKey = session?.user?.id
      ? `contact:user:${session.user.id}`
      : `contact:ip:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"}`;
    const limited = checkRateLimit(rateKey, RATE_LIMITS.contact);
    if (!limited.ok) {
      return NextResponse.json(rateLimitedBody(limited.retryAfterSec), {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      });
    }

    const inquiry = await db.contactInquiry.create({
      data: {
        userId: session?.user?.id,
        kind,
        category,
        name,
        email,
        subject,
        message,
      },
    });

    try {
      await sendContactEmail({
        name,
        email,
        subject,
        message,
        kind,
        category,
      });
    } catch (mailError) {
      console.error("contact mail failed", mailError);
      // keep inquiry saved even if SMTP temporarily fails
    }

    return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "접수에 실패했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
