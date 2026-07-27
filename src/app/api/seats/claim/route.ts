import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  CLAIM_COOKIE,
  claimErrorMessage,
  claimSeat,
  ClaimError,
  normalizeSeatSlug,
} from "@/lib/seats";

function clearClaimCookie(res: NextResponse) {
  res.cookies.set(CLAIM_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 0,
  });
}

/** Explicit JSON claim (session required). */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { slug?: string };
    const slug = normalizeSeatSlug(body.slug || "");
    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const seat = await claimSeat(session.user.id, session.user.email, slug);
    const res = NextResponse.json({
      ok: true,
      slug: seat.slug,
      status: seat.status,
    });
    clearClaimCookie(res);
    return res;
  } catch (e) {
    if (e instanceof ClaimError) {
      return NextResponse.json(
        { error: claimErrorMessage(e.code), code: e.code },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "claim failed" }, { status: 500 });
  }
}

/**
 * Browser-friendly claim used after Google OAuth return.
 * Safe to call from a Server Component via redirect (cookie write allowed here).
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const url = new URL(request.url);
  const slug = normalizeSeatSlug(url.searchParams.get("slug") || "");
  const base = process.env.NEXTAUTH_URL || process.env.APP_URL || url.origin;

  if (!session?.user?.id || !session.user.email) {
    const login = new URL("/login", base);
    login.searchParams.set("callbackUrl", slug ? `/j/${slug}` : "/today");
    return NextResponse.redirect(login);
  }

  if (!slug) {
    return NextResponse.redirect(new URL("/today", base));
  }

  try {
    await claimSeat(session.user.id, session.user.email, slug);
    const res = NextResponse.redirect(new URL("/entries/new", base));
    clearClaimCookie(res);
    return res;
  } catch (e) {
    const code = e instanceof ClaimError ? e.code : "invalid";
    const dest = new URL(`/j/${slug}`, base);
    dest.searchParams.set("claim", code);
    const res = NextResponse.redirect(dest);
    // keep cookie only if useful for retry; clear on hard failures
    if (code === "already_claimed" || code === "user_has_other_seat") {
      clearClaimCookie(res);
    }
    return res;
  }
}
