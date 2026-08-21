import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Edge middleware cannot read database sessions. We only use it as a soft gate:
 * - If a next-auth session cookie is missing, redirect pages to /login.
 * - Real authorization still happens in server components / API routes via getServerSession.
 * This avoids login <-> protected-page redirect loops with strategy: "database".
 * - /today is NOT protected since v1.3 GATE-2: guests see the global scripture card
 *   (page renders GuestTodayView without personal data).
 */
const PROTECTED_PAGE_PREFIXES = [
  "/entries",
  "/together",
  "/me",
];

function hasSessionCookie(req: NextRequest): boolean {
  const names = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "__Host-next-auth.session-token",
  ];
  return names.some((name) => Boolean(req.cookies.get(name)?.value));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never intercept auth/api internals
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const isProtectedPage = PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!isProtectedPage) {
    return NextResponse.next();
  }

  // Prefer JWT token when present (compat); otherwise accept opaque DB session cookie.
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  }).catch(() => null);

  if (token || hasSessionCookie(req)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/entries/:path*",
    "/reviews/:path*",
    "/together/:path*",
    "/me/:path*",
  ],
};
