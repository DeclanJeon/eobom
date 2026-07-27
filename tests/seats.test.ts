import { beforeAll, describe, expect, test } from "bun:test";
import { db } from "../src/lib/db";
import {
  allocateWebUserSlug,
  claimSeat,
  ClaimError,
  formatNumberedSlug,
  isKeyringSlug,
  isSeatSlug,
  isWebUserSlug,
  KEYRING_MAX,
  provisionSeats,
} from "../src/lib/seats";

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

describe("allocateWebUserSlug", () => {
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

describe("provision and claim", () => {
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
