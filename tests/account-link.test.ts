import { describe, expect, test } from "bun:test";
import type { Account } from "next-auth";
import { db } from "../src/lib/db";
import { attachGoogleAccountToUser } from "../src/lib/account-link";

function googleAccount(providerAccountId: string): Account {
  return {
    provider: "google",
    providerAccountId,
    type: "oauth",
    access_token: "access-token",
    token_type: "Bearer",
  };
}

describe("Google account attachment", () => {
  test("links a provider account to an anonymous user atomically", async () => {
    const target = await db.user.create({ data: { name: "Anonymous" } });
    const result = await attachGoogleAccountToUser(target.id, googleAccount("google-link-1"), "link-1@example.com");

    expect(result).toBe("linked");
    const linkedUser = await db.user.findUnique({ where: { id: target.id } });
    expect(linkedUser).toMatchObject({ email: "link-1@example.com" });
    const linkedAccount = await db.account.findUnique({
      where: { provider_providerAccountId: { provider: "google", providerAccountId: "google-link-1" } },
    });
    expect(linkedAccount).toMatchObject({ userId: target.id });
  });

  test("rejects email and provider ownership conflicts without mutation", async () => {
    const target = await db.user.create({ data: { name: "Target" } });
    const emailOwner = await db.user.create({ data: { email: "taken@example.com" } });
    const accountOwner = await db.user.create({ data: { name: "Account owner" } });
    await db.account.create({
      data: {
        userId: accountOwner.id,
        type: "oauth",
        provider: "google",
        providerAccountId: "google-owned-1",
      },
    });

    await expect(attachGoogleAccountToUser(target.id, googleAccount("google-new-1"), "taken@example.com")).resolves.toBe("email_in_use");
    await expect(attachGoogleAccountToUser(target.id, googleAccount("google-owned-1"), "free@example.com")).resolves.toBe("account_in_use");
    const unchangedTarget = await db.user.findUnique({ where: { id: target.id } });
    const unchangedEmailOwner = await db.user.findUnique({ where: { id: emailOwner.id } });
    expect(unchangedTarget).toMatchObject({ email: null });
    expect(unchangedEmailOwner).toMatchObject({ email: "taken@example.com" });
  });

  test("returns stable results for stale, already connected, and non-Google inputs", async () => {
    const connected = await db.user.create({ data: { email: "connected@example.com" } });
    const anonymous = await db.user.create({ data: {} });

    await expect(attachGoogleAccountToUser("missing-user", googleAccount("google-stale-1"), "stale@example.com")).resolves.toBe("stale_intent");
    await expect(attachGoogleAccountToUser(connected.id, googleAccount("google-connected-1"), "new@example.com")).resolves.toBe("already_connected");
    await expect(
      attachGoogleAccountToUser(anonymous.id, { ...googleAccount("github-1"), provider: "github" }, "github@example.com"),
    ).resolves.toBeNull();
  });
});
