import { NextResponse } from "next/server";
import { createDeviceIdentity, getCurrentUser } from "@/lib/session";
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE } from "@/lib/seats";

/**
 * 익명 기기 정체성 확보 (멱등).
 * 이미 정체성이 있으면 그대로 반환, 없으면 User+기기 토큰을 만들고 쿠키를 설정한다.
 * 로그인 없이 기기 단위로 유저를 식별하는 부트스트랩 엔드포인트.
 */
export async function POST() {
  const existing = await getCurrentUser();
  if (existing) return NextResponse.json({ user: existing });

  const { user, token } = await createDeviceIdentity();
  const res = NextResponse.json({ user });
  res.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
  return res;
}
