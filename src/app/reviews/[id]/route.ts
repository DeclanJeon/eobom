import { NextResponse } from "next/server";

/**
 * /reviews/[id] → /lookback/[id] (301 영구 이동) — 구주소 보존, SEO 링크 통합.
 * page redirect()는 307을 반환하므로 route handler에서 literal 301을 내린다.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    request.url;
  const target = new URL(`/lookback/${id}`, base);
  return NextResponse.redirect(target, 301);
}
