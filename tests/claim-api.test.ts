import { describe, expect, test, mock } from "bun:test";
import { db } from "../src/lib/db";
import {
  DEVICE_COOKIE,
  generateDeviceToken,
  hashDeviceToken,
} from "../src/lib/seats";

const EMAIL = `claim-api-${Date.now()}@test.local`;
let userId = "";
let slug = "e66";

// requireApiUser 스텁: 로그인 사용자로 취급
mock.module("@/lib/session", () => ({
  requireApiUser: async () => ({
    ok: true,
    user: { id: userId, email: EMAIL },
  }),
}));

const route = await import("../src/app/api/seats/claim/route");

describe("claim API", () => {
  test("GET returns 405 (자동 claim 폐기)", async () => {
    const res = await route.GET();
    expect(res.status).toBe(405);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("METHOD_NOT_ALLOWED");
  });

  test("POST rejects malformed JSON shapes with 400", async () => {
    for (const payload of [null, [], { slug: 123 }]) {
      const res = await route.POST(
        new Request("http://localhost/api/seats/claim", {
          method: "POST",
          body: JSON.stringify(payload),
          headers: { "content-type": "application/json" },
        }),
      );
      expect(res.status).toBe(400);
    }
  });

  test("POST claims seat and sets device cookie", async () => {
    await db.journalSeat.deleteMany({ where: { slug } });
    await db.user.deleteMany({ where: { email: EMAIL } });
    await db.journalSeat.create({
      data: { slug, seatCode: "KEYRING-66", status: "unclaimed" },
    });
    const user = await db.user.create({
      data: { email: EMAIL, personalSlug: "uclaimapi", name: "API" },
    });
    userId = user.id;

    const res = await route.POST(
      new Request("http://localhost/api/seats/claim", {
        method: "POST",
        body: JSON.stringify({ slug }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; slug: string };
    expect(body.ok).toBe(true);
    expect(body.slug).toBe(slug);

    // Set-Cookie로 기기 토큰 발급
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(DEVICE_COOKIE);
    const token = setCookie
      .split(";")[0]
      .split("=")[1] as string;
    const tokenHash = hashDeviceToken(token);
    const device = await db.userDevice.findUnique({
      where: { tokenHash },
    });
    expect(device).not.toBeNull();
    expect(device?.userId).toBe(user.id);

    // claim 상태 확인
    const seat = await db.journalSeat.findUnique({ where: { slug } });
    expect(seat?.claimedUserId).toBe(user.id);

    await db.journalSeat.deleteMany({ where: { slug } });
    await db.userDevice.deleteMany({ where: { userId: user.id } });
    await db.user.deleteMany({ where: { email: EMAIL } });
  });

  test("POST rejects already-claimed seat", async () => {
    await db.journalSeat.deleteMany({ where: { slug: "e65" } });
    await db.user.deleteMany({
      where: { email: { in: [EMAIL, "claim-api-b@test.local"] } },
    });
    const user = await db.user.create({
      data: { email: EMAIL, personalSlug: "uclaimapib" },
    });
    const other = await db.user.create({
      data: { email: "claim-api-b@test.local", personalSlug: "uclaimapic" },
    });
    userId = user.id;

    const claimed = await db.journalSeat.create({
      data: { slug: "e65", seatCode: "KEYRING-65", status: "unclaimed" },
    });
    await db.journalSeat.update({
      where: { id: claimed.id },
      data: { status: "claimed", claimedUserId: other.id },
    });

    const res = await route.POST(
      new Request("http://localhost/api/seats/claim", {
        method: "POST",
        body: JSON.stringify({ slug: "e65" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("already_claimed");

    await db.journalSeat.deleteMany({ where: { slug: "e65" } });
    await db.user.deleteMany({
      where: { email: { in: [EMAIL, "claim-api-b@test.local"] } },
    });
  });

  test("POST idempotent re-claim does not burn device slots", async () => {
    // 이미 소유한 seat로 재-claim POST → 기기 슬롯을 추가 소모하지 않는다.
    await db.journalSeat.deleteMany({ where: { slug: "e64" } });
    await db.user.deleteMany({ where: { email: EMAIL } });
    const user = await db.user.create({
      data: { email: EMAIL, personalSlug: "uclaimapid" },
    });
    userId = user.id;

    const seat = await db.journalSeat.create({
      data: { slug: "e64", seatCode: "KEYRING-64", status: "unclaimed" },
    });
    await db.journalSeat.update({
      where: { id: seat.id },
      data: { status: "claimed", claimedUserId: user.id },
    });
    const before = await db.userDevice.count({ where: { userId: user.id } });

    const res = await route.POST(
      new Request("http://localhost/api/seats/claim", {
        method: "POST",
        body: JSON.stringify({ slug: "e64" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    // Set-Cookie에 기기 토큰이 없어야 한다 (재-claim은 슬롯 미소모)
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toContain(DEVICE_COOKIE);
    const after = await db.userDevice.count({ where: { userId: user.id } });
    expect(after).toBe(before);

    await db.journalSeat.deleteMany({ where: { slug: "e64" } });
    await db.userDevice.deleteMany({ where: { userId: user.id } });
    await db.user.deleteMany({ where: { email: EMAIL } });
  });
});
