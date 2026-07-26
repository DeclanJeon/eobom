import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendContactEmail } from "@/lib/mail";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    const name = body.name?.trim() || "";
    const email = body.email?.trim() || "";
    const subject = body.subject?.trim() || "";
    const message = body.message?.trim() || "";

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "이름, 이메일, 제목, 내용을 모두 입력해 주세요." },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    const inquiry = await db.contactInquiry.create({
      data: {
        userId: session?.user?.id,
        name,
        email,
        subject,
        message,
      },
    });

    try {
      await sendContactEmail({ name, email, subject, message });
    } catch (mailError) {
      console.error("contact mail failed", mailError);
      // keep inquiry saved even if SMTP temporarily fails
    }

    return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "문의 접수에 실패했습니다." }, { status: 500 });
  }
}
