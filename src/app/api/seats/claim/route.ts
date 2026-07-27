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
    res.cookies.set(CLAIM_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
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
