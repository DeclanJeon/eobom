import { beforeAll, describe, expect, test } from "bun:test";
import { db } from "../src/lib/db";
import {
  allocateNextNumberedSlug,
  claimSeat,
  ClaimError,
  ensureClaimedSeatForUser,
  formatNumberedSlug,
  isSeatSlug,
  provisionSeats,
} from "../src/lib/seats";

describe("seat slug", () => {
  test("eNN pattern", () => {
    expect(isSeatSlug("e01")).toBe(true);
    expect(isSeatSlug("e13")).toBe(true);
    expect(isSeatSlug("e14")).toBe(true);
    expect(isSeatSlug("e100")).toBe(true);
    expect(isSeatSlug("E01")).toBe(false);
    expect(isSeatSlug("olive-01")).toBe(false);
    expect(formatNumberedSlug(1)).toBe("e01");
    expect(formatNumberedSlug(14)).toBe("e14");
    expect(formatNumberedSlug(100)).toBe("e100");
  });
});

describe("allocateNextNumberedSlug", () => {
  test("continues after highest eNN among users and seats", async () => {
    await provisionSeats({ count: 13, prefix: "e" });
    // ensure at least e13 exists as seat
    const next = await allocateNextNumberedSlug();
    const n = Number(next.replace(/^e/, ""));
    expect(n).toBeGreaterThanOrEqual(14);
    expect(isSeatSlug(next)).toBe(true);

    // simulate taking that slug
    const email = `alloc-${next}@test.local`;
    await db.user.deleteMany({ where: { email } });
    const u = await db.user.create({
      data: { email, personalSlug: next, name: "Alloc" },
    });
    await ensureClaimedSeatForUser({
      userId: u.id,
      email,
      slug: next,
    });

    const next2 = await allocateNextNumberedSlug();
    expect(Number(next2.replace(/^e/, ""))).toBe(n + 1);

    await db.journalSeat.deleteMany({ where: { slug: { in: [next, next2] } } });
    await db.user.deleteMany({ where: { email } });
  });
});

describe("provision and claim", () => {
  beforeAll(async () => {
    await provisionSeats({ count: 13, prefix: "e" });
  });

  test("provisions 13 seats idempotently", async () => {
    const again = await provisionSeats({ count: 13, prefix: "e" });
    expect(again.created.length).toBe(0);
    expect(again.skipped.length).toBe(13);
    const n = await db.journalSeat.count();
    expect(n).toBeGreaterThanOrEqual(13);
  });

  test("claim binds user and rejects second user", async () => {
    const slug = "e99";
    await db.journalSeat.deleteMany({ where: { slug } });
    await db.user.deleteMany({
      where: { email: { in: ["seat-a@test.local", "seat-b@test.local"] } },
    });
    await db.journalSeat.create({
      data: { slug, seatCode: "KEYRING-99", status: "unclaimed" },
    });
    const a = await db.user.create({
      data: {
        email: "seat-a@test.local",
        personalSlug: "temp-a",
        name: "A",
      },
    });
    const b = await db.user.create({
      data: {
        email: "seat-b@test.local",
        personalSlug: "temp-b",
        name: "B",
      },
    });

    const seat = await claimSeat(a.id, a.email, slug);
    expect(seat.status).toBe("claimed");
    expect(seat.claimedUserId).toBe(a.id);

    const ua = await db.user.findUniqueOrThrow({ where: { id: a.id } });
    expect(ua.personalSlug).toBe(slug);
    expect(ua.seatClaimedAt).toBeTruthy();

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

  test("one seat per user", async () => {
    await db.journalSeat.deleteMany({
      where: { slug: { in: ["e97", "e98"] } },
    });
    await db.user.deleteMany({ where: { email: "seat-c@test.local" } });
    await db.journalSeat.create({
      data: { slug: "e97", seatCode: "KEYRING-97", status: "unclaimed" },
    });
    await db.journalSeat.create({
      data: { slug: "e98", seatCode: "KEYRING-98", status: "unclaimed" },
    });
    const u = await db.user.create({
      data: {
        email: "seat-c@test.local",
        personalSlug: "temp-c",
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
