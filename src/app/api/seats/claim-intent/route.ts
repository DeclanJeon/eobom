import { NextResponse } from "next/server";
import {
  CLAIM_COOKIE,
  CLAIM_COOKIE_MAX_AGE,
  isKeyringSlug,
  normalizeSeatSlug,
} from "@/lib/seats";

/** Only keyring addresses e01–e10000 may be stored as claim intent. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { slug?: string };
    const slug = normalizeSeatSlug(body.slug || "");
    if (!slug || !isKeyringSlug(slug)) {
      return NextResponse.json(
        { error: "invalid keyring slug" },
        { status: 400 },
      );
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
