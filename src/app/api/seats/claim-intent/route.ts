import { NextResponse } from "next/server";
import {
  CLAIM_COOKIE,
  CLAIM_COOKIE_MAX_AGE,
  isSeatSlug,
  normalizeSeatSlug,
} from "@/lib/seats";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { slug?: string };
    const slug = normalizeSeatSlug(body.slug || "");
    if (!slug || !isSeatSlug(slug)) {
      // allow non eXX for future but require simple pattern
      if (!/^[a-z0-9][a-z0-9-]{1,31}$/.test(slug)) {
        return NextResponse.json({ error: "invalid slug" }, { status: 400 });
      }
    }

    const res = NextResponse.json({ ok: true, slug });
    res.cookies.set(CLAIM_COOKIE, slug, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
      path: "/",
      maxAge: CLAIM_COOKIE_MAX_AGE,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
