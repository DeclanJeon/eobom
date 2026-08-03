import { NextResponse } from "next/server";
import { verifyUnsubscribeToken } from "@/lib/mail";
import { db } from "@/lib/db";

/**
 * GET /api/email/unsubscribe?token={token}
 *
 * 이메일 알림 구독 해지. 토큰 검증 후 emailNotifications를 false로 변경한다.
 * 해지 완료 페이지로 리다이렉트한다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("잘못된 요청입니다.", { status: 400 });
  }

  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    return new NextResponse("유효하지 않거나 만료된 링크입니다.", { status: 401 });
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: { emailNotifications: false },
    });

    // 해지 완료 페이지로 리다이렉트
    const baseUrl = process.env.NEXTAUTH_URL || "https://eobom.ponslink.com";
    return NextResponse.redirect(`${baseUrl}/email-unsubscribed`);
  } catch {
    return new NextResponse("처리에 실패했습니다.", { status: 500 });
  }
}
