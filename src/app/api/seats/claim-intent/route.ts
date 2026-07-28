import { NextResponse } from "next/server";
import { claimIntentSchema, parseJsonBody } from "@/lib/api-schemas";
import {
  CLAIM_COOKIE,
  CLAIM_COOKIE_MAX_AGE,
  isKeyringSlug,
  normalizeSeatSlug,
} from "@/lib/seats";

/** Only keyring addresses e01–e10000 may be stored as claim intent. */
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, claimIntentSchema);
  if (!parsed.ok) return parsed.response;

  const slug = normalizeSeatSlug(parsed.data.slug || "");
  if (!slug || !isKeyringSlug(slug)) {
    return NextResponse.json(
      { error: "invalid keyring slug", code: "VALIDATION" },
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
}
