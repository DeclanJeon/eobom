import { NextResponse } from "next/server";
import {
  CLAIM_COOKIE,
  claimErrorMessage,
  claimSeat,
  ClaimError,
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  normalizeSeatSlug,
} from "@/lib/seats";
import {
  createDeviceIdentity,
  getCurrentUser,
} from "@/lib/session";
import {
  checkRateLimit,
  RATE_LIMITS,
  rateLimitedBody,
} from "@/lib/rate-limit";
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

/**
 * 키링 claim — 로그인 없음.
 * 익명 기기 identity가 없으면 즉석에서 만들고, 그 identity에 seat을 바인딩한다.
 * claim 성공 시 이 브라우저는 소유자 기기로 등록된다 (쿠키는 Route Handler에서만).
 */
export async function POST(request: Request) {
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

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const limited = await checkRateLimit(`seats:claim:${ip}`, RATE_LIMITS.seatsClaim);
  if (!limited.ok) {
    return NextResponse.json(rateLimitedBody(limited.retryAfterSec), {
      status: 429,
      headers: { "Retry-After": String(limited.retryAfterSec) },
    });
  }

  // 정체성 해석/생성 — 익명 기기 사용자는 여기서 처음 User가 만들어진다.
  let user = await getCurrentUser();
  let newToken: string | null = null;
  if (!user) {
    const created = await createDeviceIdentity();
    user = created.user;
    newToken = created.token;
  }

  try {
    const seat = await claimSeat(user.id, user.email ?? null, slug);

    let res: NextResponse = NextResponse.json({
      ok: true,
      slug: seat.slug,
      status: seat.status,
    });
    if (newToken) res = setDeviceCookie(res, newToken);
    clearClaimCookie(res);
    return res;
  } catch (e) {
    if (e instanceof ClaimError) {
      return NextResponse.json(
        { error: claimErrorMessage(e.code), code: e.code },
        { status: 409 },
      );
    }
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
 * claim은 POST(명시적 동의)에서만 수행한다.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Method Not Allowed", code: "METHOD_NOT_ALLOWED" },
    { status: 405 },
  );
}
