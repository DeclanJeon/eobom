import { NextResponse } from "next/server";
import { getSession, requireApiUser } from "@/lib/session";
import {
  CLAIM_COOKIE,
  claimErrorMessage,
  claimSeat,
  ClaimError,
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  generateDeviceToken,
  getSeatBySlug,
  normalizeSeatSlug,
  registerDevice,
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

function setDeviceCookie(res: NextResponse, token: string) {
  res.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
  return res;
}

/** Explicit JSON claim (session required). 기기 토큰을 발급해 소유자 기기로 등록한다. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  if (!user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "invalid body" }, { status: 400 });
    }
    if (!("slug" in body) || typeof body.slug !== "string") {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }
    const slug = normalizeSeatSlug(body.slug);
    if (!slug) {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    // 기기 등록: 처음 claim(unclaimed → claimed) 전환 시에만 이 브라우저를
    // 소유자 기기로 바인딩한다. 멱등 재-claim(이미 소유자)은 슬롯을 소모하지 않는다.
    const wasUnclaimed = (await getSeatBySlug(slug))?.status === "unclaimed";
    const seat = await claimSeat(user.id, user.email, slug);

    let res: NextResponse = NextResponse.json({
      ok: true,
      slug: seat.slug,
      status: seat.status,
    });
    if (wasUnclaimed) {
      const { token } = generateDeviceToken();
      await registerDevice(user.id, token, "keyring-claim");
      res = setDeviceCookie(res, token);
    }
    clearClaimCookie(res);
    return res;
  } catch (e) {
    if (e instanceof ClaimError) {
      return NextResponse.json(
        { error: claimErrorMessage(e.code), code: e.code },
        { status: 409 },
      );
    }
    // Prisma unique violation (P2002) / SQLite BUSY — race에서 진 safety net이
    // ClaimError로 변환되기 전에 나가는 경우도 409로 안내한다.
    const code = (e as { code?: string }).code;
    if (code === "P2002" || String(e).includes("SQLITE_BUSY")) {
      return NextResponse.json(
        { error: claimErrorMessage("already_claimed"), code: "already_claimed" },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "claim failed" }, { status: 500 });
  }
}

/**
 * GET은 폐기 — page의 자동 claim redirect로 인한 선점 공격을 막는다.
 * claim은 POST(명시적 동의) 또는 OAuth 콜백(claim-intent 쿠키)에서만 수행한다.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed", code: "METHOD_NOT_ALLOWED" },
    { status: 405 },
  );
}
