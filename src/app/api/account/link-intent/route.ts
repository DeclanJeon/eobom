import { NextResponse } from "next/server";
import { createAccountLinkIntent, ACCOUNT_LINK_COOKIE, ACCOUNT_LINK_MAX_AGE } from "@/lib/account-link-intent";
import { getCurrentUser } from "@/lib/session";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.email) {
    return NextResponse.json({ error: "이미 Google 계정이 연결되어 있습니다." }, { status: 409 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCOUNT_LINK_COOKIE, createAccountLinkIntent(user.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: ACCOUNT_LINK_MAX_AGE,
  });
  return response;
}
