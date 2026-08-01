import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  generateDeviceToken,
  getSeatBySlug,
  isKeyringSlug,
  normalizeSeatSlug,
  registerDevice,
} from "@/lib/seats";

function setDeviceCookie(res: NextResponse, token: string) {
  res.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
}

/**
 * 소유자 기기 등록 전용 라우트.
 * /j/[slug] 페이지가 "소유자 로그인 + 기기 미등록"을 감지하면 이곳으로 redirect하고,
 * 여기서 기기 토큰을 발급·쿠키 설정 후 원래 키링 페이지로 돌려보낸다.
 * (Next.js 서버 컴포넌트에서는 쿠키를 쓸 수 없으므로 Route Handler를 경유한다.)
 */
export async function GET(request: Request) {
  // 이 GET은 쿠키를 발급하고 기기 슬롯을 변경한다. 브라우저의
  // cross-site top-level navigation으로 강제 실행되지 않도록 Fetch Metadata를
  // 확인한다. 내부 /j/[slug] → redirect 흐름은 same-origin이다.
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "cross-site request rejected" }, { status: 403 });
  }
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const url = new URL(request.url);
  const rawSlug = url.searchParams.get("slug") || "";
  const slug = normalizeSeatSlug(rawSlug);
  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || url.origin;

  if (!slug || !isKeyringSlug(slug)) {
    return NextResponse.redirect(new URL("/today", base));
  }

  // 소유자 본인만 기기 등록 가능
  const seat = await getSeatBySlug(slug);
  if (seat?.status !== "claimed" || seat.claimedUserId !== user.id) {
    return NextResponse.redirect(new URL(`/j/${slug}`, base));
  }

  const { token } = generateDeviceToken();
  await registerDevice(user.id, token, "keyring-owner");

  const res = NextResponse.redirect(new URL(`/j/${slug}`, base));
  setDeviceCookie(res, token);
  return res;
}
