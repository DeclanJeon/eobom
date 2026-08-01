import { describe, expect, test } from "bun:test";
import { db } from "../src/lib/db";
import { normalizeSeatSlug } from "../src/lib/seats";

describe("lookback redesign", () => {
  test("normalizeSeatSlug keeps lookback-style slugs intact", () => {
    // 슬러그 유틸 회귀 방지: 라우트 이동과 무관하게 동작 유지
    expect(normalizeSeatSlug("e12")).toBe("e12");
    expect(normalizeSeatSlug("  E12 ")).toBe("e12");
    expect(normalizeSeatSlug("u3k9m2x7a")).toBe("u3k9m2x7a");
  });

  test("normalizeSeatSlug canonicalizes numbered aliases", () => {
    // SLUG-ALIAS: e1/e00001 별칭 행 생성 방지 — 정규형으로 통일
    expect(normalizeSeatSlug("e1")).toBe("e01");
    expect(normalizeSeatSlug("e00001")).toBe("e01");
    expect(normalizeSeatSlug("E1")).toBe("e01");
    expect(normalizeSeatSlug("e100")).toBe("e100");
    expect(normalizeSeatSlug("e0")).toBe("e0"); // 범위 밖 — 원문 유지
    expect(normalizeSeatSlug("e10001")).toBe("e10001"); // 범위 밖
  });

  test("robots disallow includes /lookback", async () => {
    const robots = (await import("../src/app/robots")).default();
    const disallow = robots.rules[0].disallow ?? [];
    expect(disallow).toContain("/lookback");
    expect(disallow).toContain("/reviews"); // 레거시 주소 보존
  });

  test("reviews page returns 301 to /lookback using request origin", async () => {
    // literal 301 + request host 유지 — NEXTAUTH_URL 미설정 시 localhost로 오염하지 않는다.
    const mod = await import("../src/app/reviews/route");
    expect(typeof mod.GET).toBe("function");
    const res = await mod.GET(new Request("https://example.test/reviews"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://example.test/lookback");
  });

  test("reviews/[id] page returns 301 to /lookback/[id] using request origin", async () => {
    const mod = await import("../src/app/reviews/[id]/route");
    expect(typeof mod.GET).toBe("function");
    const res = await mod.GET(new Request("https://example.test/reviews/e12"), {
      params: Promise.resolve({ id: "e12" }),
    });
    const location = res.headers.get("location");
    expect(res.headers.get("location")).toBe("https://example.test/lookback/e12");
  });

  test("db: reviewReport + userVisualization 조회 쿼리 형태 검증", async () => {
    // /lookback 목록·상세에서 사용하는 조회 조건이 유효한 컬럼으로 구성되는지
    const reportCount = await db.reviewReport.count({
      where: { userId: "__none__", deletedAt: null },
    });
    expect(reportCount).toBe(0);

    const viz = await db.userVisualization.findFirst({
      where: { userId: "__none__", status: "complete", imageUrl: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    expect(viz).toBeNull();
  });
});
