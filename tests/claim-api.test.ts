import { describe, expect, test, mock } from "bun:test";
import { db } from "../src/lib/db";
import * as realSession from "../src/lib/session";
import {
  DEVICE_COOKIE,
  generateDeviceToken,
  hashDeviceToken,
} from "../src/lib/seats";

let slug = "e66";
let currentUserId: string | null = null;
const createdUserIds: string[] = [];

// 익명 identity 스텁: currentUserId가 null이면 신규 생성 경로를 탄다.
// 나머지 export(requireApiUser 등)는 실제 구현을 보존해 다른 테스트와 격리 충돌을 막는다.
mock.module("@/lib/session", () => ({
  ...realSession,
  getCurrentUser: async () =>
    currentUserId ? { id: currentUserId, email: null } : null,
  createDeviceIdentity: async () => {
    const { token, tokenHash } = generateDeviceToken();
    const u = await db.user.create({
      data: { personalSlug: `uc${Date.now()}${Math.floor(Math.random() * 1e6)}` },
    });
    await db.userDevice.create({ data: { userId: u.id, tokenHash } });
    currentUserId = u.id;
    createdUserIds.push(u.id);
    return { user: { id: u.id, email: null }, token };
  },
}));
const route = await import("../src/app/api/seats/claim/route");

async function cleanup() {
  await db.journalSeat.deleteMany({ where: { slug } });
  await db.userDevice.deleteMany({
    where: { userId: { in: createdUserIds } },
  });
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds.length = 0;
  currentUserId = null;
}

describe("claim API (anonymous)", () => {
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

  test("POST claims seat, creates anonymous identity, sets device cookie", async () => {
    await cleanup();
    await db.journalSeat.create({
      data: { slug, seatCode: "KEYRING-66", status: "unclaimed" },
    });
    currentUserId = null;

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

    // 신규 identity → Set-Cookie로 기기 토큰 발급
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(DEVICE_COOKIE);
    const token = setCookie.split(";")[0].split("=")[1] as string;
    const tokenHash = hashDeviceToken(token);
    const device = await db.userDevice.findUnique({ where: { tokenHash } });
    expect(device).not.toBeNull();
    expect(device?.userId).toBe(currentUserId!);

    const seat = await db.journalSeat.findUnique({ where: { slug } });
    expect(seat?.claimedUserId).toBe(currentUserId!);

    await cleanup();
  });

  test("POST rejects already-claimed seat", async () => {
    await cleanup();
    const other = await db.user.create({
      data: { personalSlug: `uo${Date.now()}` },
    });
    const me = await db.user.create({
      data: { personalSlug: `um${Date.now() + 1}` },
    });
    createdUserIds.push(other.id, me.id);
    currentUserId = me.id;

    const claimed = await db.journalSeat.create({
      data: { slug, seatCode: "KEYRING-65", status: "unclaimed" },
    });
    await db.journalSeat.update({
      where: { id: claimed.id },
      data: { status: "claimed", claimedUserId: other.id },
    });

    const res = await route.POST(
      new Request("http://localhost/api/seats/claim", {
        method: "POST",
        body: JSON.stringify({ slug }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("already_claimed");

    await cleanup();
  });

  test("POST idempotent re-claim does not burn device slots", async () => {
    await cleanup();
    const me = await db.user.create({
      data: { personalSlug: `ur${Date.now()}` },
    });
    createdUserIds.push(me.id);
    currentUserId = me.id;

    const seat = await db.journalSeat.create({
      data: { slug, seatCode: "KEYRING-64", status: "unclaimed" },
    });
    await db.journalSeat.update({
      where: { id: seat.id },
      data: { status: "claimed", claimedUserId: me.id },
    });
    const before = await db.userDevice.count({ where: { userId: me.id } });

    const res = await route.POST(
      new Request("http://localhost/api/seats/claim", {
        method: "POST",
        body: JSON.stringify({ slug }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(200);
    // identity가 이미 있으므로 기기 토큰 미발급 (슬롯 미소모)
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).not.toContain(DEVICE_COOKIE);
    const after = await db.userDevice.count({ where: { userId: me.id } });
    expect(after).toBe(before);

    await cleanup();
  });
});
