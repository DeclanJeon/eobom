import { NextResponse } from "next/server";

/**
 * /reviews → /lookback (301 영구 이동) — 구주소 보존, SEO 링크 통합.
 * page redirect()는 307을 반환하므로 route handler에서 literal 301을 내린다.
 */
export async function GET(request: Request) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    request.url;
  return NextResponse.redirect(new URL("/lookback", base), 301);
}
