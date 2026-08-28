import { NextResponse, type NextRequest } from "next/server";

// CSRF 방어: 상태 변경 요청에 대해 Origin/Referer 검증
// - GET /api/seats/device 는 쿠키 발급+기기 슬롯 변경을 하므로 POST로 전환을 권장하나,
//   기존 호환을 위해 GET도 sec-fetch-site와 Origin 이중 검증
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // API 쓰기 경로만 검사
  const isApiWrite =
    pathname.startsWith("/api/identity") ||
    pathname.startsWith("/api/today/impression") ||
    pathname.startsWith("/api/moments/") ||
    pathname.startsWith("/api/seats/device");

  if (!isApiWrite) return NextResponse.next();

  const method = request.method.toUpperCase();
  const isStateChanging = STATE_CHANGING_METHODS.has(method) || pathname.startsWith("/api/seats/device");

  if (!isStateChanging) return NextResponse.next();

  const secFetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  // sec-fetch-site가 cross-site면 차단
  if (secFetchSite === "cross-site") {
    return NextResponse.json({ error: "cross-site forbidden" }, { status: 403 });
  }

  // Origin이 있으면 host와 비교
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return NextResponse.json({ error: "origin mismatch" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "invalid origin" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Origin이 없고 Referer가 있으면 Referer host 비교 (구형 브라우저 대응)
  if (referer) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return NextResponse.json({ error: "referer mismatch" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "invalid referer" }, { status: 403 });
    }
    return NextResponse.next();
  }

  // 둘 다 없으면 헤더 없는 구형 브라우저로 간주해 통과 (관측 필요)
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
