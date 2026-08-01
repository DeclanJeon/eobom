import { describe, expect, test } from "bun:test";
import { db } from "../src/lib/db";
import {
  claimSeat,
  generateDeviceToken,
  hashDeviceToken,
  registerDevice,
} from "../src/lib/seats";
import { decideKeyringAccess } from "../src/lib/keyring-access";

// ─── decideKeyringAccess: 5분기 접근 결정 (HTML 소유자명 미노출 포함) ─────────
describe("keyring access decision", () => {
  const OWNER = "kring-owner-user";
  const OTHER = "kring-other-user";
  const slug = "e77";

  async function makeSeat(status: "unclaimed" | "claimed" | "revoked") {
    await db.journalSeat.deleteMany({ where: { slug } });
    await db.userDevice.deleteMany({
      where: { userId: { in: [OWNER, OTHER] } },
    });
    await db.user.deleteMany({
      where: { email: { in: ["kring-a@test.local", "kring-b@test.local"] } },
    });

    const owner = await db.user.create({
      data: { email: "kring-a@test.local", id: OWNER, personalSlug: "ukringaaa" },
    });
    const other = await db.user.create({
      data: { email: "kring-b@test.local", id: OTHER, personalSlug: "ukringbbb" },
    });

    const seat = await db.journalSeat.create({
      data: { slug, seatCode: `KEYRING-77`, status: "unclaimed" },
    });
    if (status === "claimed") {
      await claimSeat(OWNER, owner.email, slug);
    } else if (status === "revoked") {
      await claimSeat(OWNER, owner.email, slug);
      await db.journalSeat.update({
        where: { id: seat.id },
        data: { status: "revoked" },
      });
    }
    return { owner, other };
  }

  test("unclaimed + guest → first_register", async () => {
    await makeSeat("unclaimed");
    const decision = await decideKeyringAccess({
      seat: { status: "unclaimed", claimedUserId: null },
      legacyOwner: null,
      viewer: null,
      deviceHash: null,
    });
    expect(decision.kind).toBe("first_register");
  });

  test("unclaimed + logged-in → claim_prompt (자동 claim 금지)", async () => {
    const { owner } = await makeSeat("unclaimed");
    const decision = await decideKeyringAccess({
      seat: { status: "unclaimed", claimedUserId: null },
      legacyOwner: null,
      viewer: { id: owner.id },
      deviceHash: null,
    });
    expect(decision.kind).toBe("claim_prompt");
  });

  test("claimed + owner logged-in → owner_home", async () => {
    const { owner } = await makeSeat("claimed");
    const decision = await decideKeyringAccess({
      seat: { status: "claimed", claimedUserId: owner.id },
      legacyOwner: null,
      viewer: { id: owner.id },
      deviceHash: null,
    });
    expect(decision.kind).toBe("owner_home");
  });

  test("claimed + other logged-in → blocked_other", async () => {
    const { owner, other } = await makeSeat("claimed");
    const decision = await decideKeyringAccess({
      seat: { status: "claimed", claimedUserId: owner.id },
      legacyOwner: null,
      viewer: { id: other.id },
      deviceHash: null,
    });
    expect(decision.kind).toBe("blocked_other");
  });

  test("claimed + guest + owner device → owner_login_prompt", async () => {
    const { owner } = await makeSeat("claimed");
    const { token } = generateDeviceToken();
    await registerDevice(owner.id, token, "test");
    const deviceHash = hashDeviceToken(token);
    const decision = await decideKeyringAccess({
      seat: { status: "claimed", claimedUserId: owner.id },
      legacyOwner: null,
      viewer: null,
      deviceHash,
    });
    expect(decision.kind).toBe("owner_login_prompt");
  });

  test("claimed + guest + non-owner device → private_page (무정보 차단)", async () => {
    await makeSeat("claimed");
    const decision = await decideKeyringAccess({
      seat: { status: "claimed", claimedUserId: "someone-else" },
      legacyOwner: null,
      viewer: null,
      deviceHash: null,
    });
    expect(decision.kind).toBe("private_page");
  });

  test("revoked → revoked", async () => {
    await makeSeat("revoked");
    const decision = await decideKeyringAccess({
      seat: { status: "revoked", claimedUserId: null },
      legacyOwner: null,
      viewer: { id: "x" },
      deviceHash: null,
    });
    expect(decision.kind).toBe("revoked");
  });
});
