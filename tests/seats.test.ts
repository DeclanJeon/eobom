import { beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
import { db } from "../src/lib/db";
import {
  allocateWebUserSlug,
  claimSeat,
  ClaimError,
  DEVICE_COOKIE,
  DEVICE_LIMIT_PER_USER,
  formatNumberedSlug,
  generateDeviceToken,
  getDeviceTokenHash,
  hashDeviceToken,
  isKeyringSlug,
  isOwnerDevice,
  isSeatSlug,
  isWebUserSlug,
  KEYRING_MAX,
  provisionSeats,
  registerDevice,
} from "../src/lib/seats";

/** Resolve Prisma `file:` URLs. Prisma resolves relative paths against the schema dir (prisma/). */
export function resolveSqlitePath(url: string): string | null {
  if (!url.startsWith("file:")) return null;
  let filePath = url.slice("file:".length);
  // file:/abs or file:///abs
  if (filePath.startsWith("///")) filePath = filePath.slice(2);
  if (filePath.startsWith("/") && !filePath.startsWith("//")) {
    return filePath;
  }
  return path.resolve(process.cwd(), "prisma", filePath.replace(/^\.\//, ""));
}

function dbAvailable() {
  const url = process.env.DATABASE_URL || "";
  const filePath = resolveSqlitePath(url);
  return Boolean(filePath && existsSync(filePath));
}

const hasDb = dbAvailable();
const dbDescribe = hasDb ? describe : describe.skip;

describe("resolveSqlitePath", () => {
  test("absolute and relative file URLs", () => {
    expect(resolveSqlitePath("file:/tmp/x.db")).toBe("/tmp/x.db");
    expect(resolveSqlitePath("postgres://x")).toBeNull();
    const rel = resolveSqlitePath("file:./db/eobom.db");
    expect(rel?.endsWith("db/eobom.db")).toBe(true);
  });
});

describe("slug namespaces", () => {
  test("keyring e01–e10000", () => {
    expect(isKeyringSlug("e01")).toBe(true);
    expect(isKeyringSlug("e13")).toBe(true);
    expect(isKeyringSlug("e14")).toBe(true);
    expect(isKeyringSlug("e10000")).toBe(true);
    expect(isKeyringSlug("e10001")).toBe(false);
    expect(isKeyringSlug("e00")).toBe(false);
    expect(isKeyringSlug("u3k9m2x7a")).toBe(false);
    expect(isSeatSlug("e42")).toBe(true);
    expect(formatNumberedSlug(1)).toBe("e01");
    expect(formatNumberedSlug(14)).toBe("e14");
    expect(formatNumberedSlug(100)).toBe("e100");
    expect(formatNumberedSlug(10000)).toBe("e10000");
    expect(KEYRING_MAX).toBe(10000);
  });

  test("web user slug pattern", () => {
    expect(isWebUserSlug("u3k9m2x7a")).toBe(true);
    expect(isWebUserSlug("uabcdefgh")).toBe(true);
    expect(isWebUserSlug("e14")).toBe(false);
    expect(isWebUserSlug("u123")).toBe(false);
  });
});

dbDescribe("allocateWebUserSlug", () => {
  test("returns u-prefixed unique slug outside keyring namespace", async () => {
    const a = await allocateWebUserSlug();
    const b = await allocateWebUserSlug();
    expect(isWebUserSlug(a)).toBe(true);
    expect(isWebUserSlug(b)).toBe(true);
    expect(isKeyringSlug(a)).toBe(false);
    expect(a).not.toBe(b);

    // reserved even if user holds it
    await db.user.deleteMany({ where: { email: "web-slug@test.local" } });
    await db.user.create({
      data: { email: "web-slug@test.local", personalSlug: a },
    });
    const c = await allocateWebUserSlug();
    expect(c).not.toBe(a);
    await db.user.deleteMany({ where: { email: "web-slug@test.local" } });
  });
});

dbDescribe("provision and claim", () => {
  beforeAll(async () => {
    await provisionSeats({ count: 13, prefix: "e" });
  });

  test("provisions keyring batch idempotently", async () => {
    const again = await provisionSeats({ count: 13, prefix: "e" });
    expect(again.created.length).toBe(0);
    expect(again.skipped.length).toBe(13);
  });

  test("claim binds user and rejects second user", async () => {
    const slug = "e99";
    await db.journalSeat.deleteMany({ where: { slug } });
    await db.user.deleteMany({
      where: { email: { in: ["seat-a@test.local", "seat-b@test.local"] } },
    });
    const a = await db.user.create({
      data: {
        email: "seat-a@test.local",
        personalSlug: "uaaaaaaaa",
        name: "A",
      },
    });
    const b = await db.user.create({
      data: {
        email: "seat-b@test.local",
        personalSlug: "ubbbbbbbb",
        name: "B",
      },
    });

    const seat = await claimSeat(a.id, a.email, slug);
    expect(seat.status).toBe("claimed");
    expect(seat.claimedUserId).toBe(a.id);

    const ua = await db.user.findUniqueOrThrow({ where: { id: a.id } });
    expect(ua.personalSlug).toBe(slug);

    await claimSeat(a.id, a.email, slug);

    let code = "";
    try {
      await claimSeat(b.id, b.email, slug);
    } catch (e) {
      if (e instanceof ClaimError) code = e.code;
    }
    expect(code).toBe("already_claimed");

    await db.journalSeat.deleteMany({ where: { slug } });
    await db.user.deleteMany({
      where: { email: { in: ["seat-a@test.local", "seat-b@test.local"] } },
    });
  });

  test("rejects non-keyring claim slugs", async () => {
    const u = await db.user.create({
      data: {
        email: "seat-web@test.local",
        personalSlug: "ucccccccc",
      },
    });
    let code = "";
    try {
      await claimSeat(u.id, u.email, "u3k9m2x7a");
    } catch (e) {
      if (e instanceof ClaimError) code = e.code;
    }
    expect(code).toBe("invalid");
    await db.user.deleteMany({ where: { email: "seat-web@test.local" } });
  });

  test("one keyring seat per user", async () => {
    await db.journalSeat.deleteMany({
      where: { slug: { in: ["e97", "e98"] } },
    });
    await db.user.deleteMany({ where: { email: "seat-c@test.local" } });
    const u = await db.user.create({
      data: {
        email: "seat-c@test.local",
        personalSlug: "udddddddd",
      },
    });
    await claimSeat(u.id, u.email, "e97");
    let code = "";
    try {
      await claimSeat(u.id, u.email, "e98");
    } catch (e) {
      if (e instanceof ClaimError) code = e.code;
    }
    expect(code).toBe("user_has_other_seat");
    await db.journalSeat.deleteMany({
      where: { slug: { in: ["e97", "e98"] } },
    });
    await db.user.deleteMany({ where: { email: "seat-c@test.local" } });
  });
});

describe("device token", () => {
  test("generateDeviceToken returns 32-byte base64url + sha256 hash", () => {
    const { token, tokenHash } = generateDeviceToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashDeviceToken(token)).toBe(tokenHash);
    // 같은 토큰은 같은 해시, 서로 다른 토큰은 다른 해시
    const other = generateDeviceToken();
    expect(other.token).not.toBe(token);
    expect(other.tokenHash).not.toBe(tokenHash);
  });

  test("getDeviceTokenHash extracts only the device cookie from a Cookie header", () => {
    const { token } = generateDeviceToken();
    const header = `other=a; ${DEVICE_COOKIE}=${token}; next-auth=b`;
    expect(getDeviceTokenHash(header)).toBe(hashDeviceToken(token));
    expect(getDeviceTokenHash("other=a; next-auth=b")).toBeNull();
    expect(getDeviceTokenHash(null)).toBeNull();
    expect(getDeviceTokenHash(undefined)).toBeNull();
  });
});

dbDescribe("device registration", () => {
  test("isOwnerDevice: unregistered / wrong user / revoked all rejected", async () => {
    await db.userDevice.deleteMany({
      where: { userId: { in: ["dev-user-a", "dev-user-b"] } },
    });
    const u = await db.user.create({
      data: { email: "dev-a@test.local", id: "dev-user-a", personalSlug: "udevaaaaa" },
    });
    const other = await db.user.create({
      data: { email: "dev-b@test.local", id: "dev-user-b", personalSlug: "udevbbbbb" },
    });
    const { token, tokenHash } = generateDeviceToken();

    // 미등록
    expect(await isOwnerDevice(u.id, tokenHash)).toBe(false);
    expect(await isOwnerDevice(u.id, null)).toBe(false);

    await registerDevice(u.id, token, "test-device");
    expect(await isOwnerDevice(u.id, tokenHash)).toBe(true);
    // 다른 사용자의 기기로는 인식 안 됨
    expect(await isOwnerDevice(other.id, tokenHash)).toBe(false);

    // revoke 후에는 인식 안 됨
    await db.userDevice.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
    expect(await isOwnerDevice(u.id, tokenHash)).toBe(false);

    await db.userDevice.deleteMany({
      where: { userId: { in: ["dev-user-a", "dev-user-b"] } },
    });
    await db.user.deleteMany({
      where: { email: { in: ["dev-a@test.local", "dev-b@test.local"] } },
    });
  });

  test("registerDevice caps at DEVICE_LIMIT_PER_USER and revokes the oldest", async () => {
    await db.userDevice.deleteMany({ where: { userId: "dev-user-cap" } });
    await db.user.create({
      data: { email: "dev-cap@test.local", id: "dev-user-cap", personalSlug: "udevccccc" },
    });

    const tokens = Array.from({ length: DEVICE_LIMIT_PER_USER + 1 }, () =>
      generateDeviceToken(),
    );
    for (const { token } of tokens) {
      await registerDevice("dev-user-cap", token, "cap-device");
    }

    const devices = await db.userDevice.findMany({
      where: { userId: "dev-user-cap", revokedAt: null },
      orderBy: { createdAt: "asc" },
    });
    expect(devices.length).toBe(DEVICE_LIMIT_PER_USER);
    // 가장 오래된 첫 기기는 revoke됨
    expect(await isOwnerDevice("dev-user-cap", tokens[0].tokenHash)).toBe(false);
    // 마지막 등록 기기는 유효
    expect(await isOwnerDevice("dev-user-cap", tokens.at(-1)!.tokenHash)).toBe(true);

    await db.userDevice.deleteMany({ where: { userId: "dev-user-cap" } });
    await db.user.deleteMany({ where: { email: "dev-cap@test.local" } });
  });

  test("serializes concurrent registrations at the device cap", async () => {
    await db.userDevice.deleteMany({ where: { userId: "dev-user-race" } });
    await db.user.deleteMany({ where: { id: "dev-user-race" } });
    await db.user.create({
      data: {
        email: "dev-race@test.local",
        id: "dev-user-race",
        personalSlug: "udevracee",
      },
    });

    const seeded = Array.from({ length: DEVICE_LIMIT_PER_USER - 1 }, () =>
      generateDeviceToken(),
    );
    for (const { token } of seeded) {
      await registerDevice("dev-user-race", token, "race-seed");
    }

    const concurrent = [generateDeviceToken(), generateDeviceToken()];
    const results = await Promise.allSettled(
      concurrent.map(({ token }) =>
        registerDevice("dev-user-race", token, "race-concurrent"),
      ),
    );
    expect(results.every((result) => result.status === "fulfilled")).toBe(true);

    const active = await db.userDevice.count({
      where: { userId: "dev-user-race", revokedAt: null },
    });
    expect(active).toBe(DEVICE_LIMIT_PER_USER);
    for (const { tokenHash } of concurrent) {
      expect(await isOwnerDevice("dev-user-race", tokenHash)).toBe(true);
    }

    await db.userDevice.deleteMany({ where: { userId: "dev-user-race" } });
    await db.user.deleteMany({ where: { id: "dev-user-race" } });
  });
});
