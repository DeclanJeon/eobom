import type { Account } from "next-auth";
import { db } from "@/lib/db";

export type AccountLinkResult =
  | "linked"
  | "stale_intent"
  | "already_connected"
  | "email_in_use"
  | "account_in_use";

export function accountLinkRedirect(result: AccountLinkResult): string {
  if (result === "linked" || result === "already_connected") return "/me/settings?linked=1";
  return `/me/settings?linkError=${encodeURIComponent(result)}`;
}

export async function attachGoogleAccountToUser(
  targetUserId: string,
  account: Account,
  email: string,
): Promise<AccountLinkResult | null> {
  if (account.provider !== "google" || !account.providerAccountId) return null;

  const target = await db.user.findUnique({ where: { id: targetUserId } });
  if (!target) return "stale_intent";
  if (target.email) return "already_connected";

  const existingEmail = await db.user.findUnique({ where: { email } });
  if (existingEmail && existingEmail.id !== target.id) return "email_in_use";

  const existingAccount = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
  });
  if (existingAccount) return existingAccount.userId === target.id ? "already_connected" : "account_in_use";

  try {
    await db.$transaction([
      db.user.update({
        where: { id: target.id },
        data: {
          email,
          emailVerified: new Date(),
          name: target.name ?? null,
          image: target.image ?? null,
          profileImageUrl: target.image ?? null,
        },
      }),
      db.account.create({
        data: {
          userId: target.id,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refresh_token: account.refresh_token ?? null,
          access_token: account.access_token ?? null,
          expires_at: account.expires_at ?? null,
          token_type: account.token_type ?? null,
          scope: account.scope ?? null,
          id_token: account.id_token ?? null,
          session_state: account.session_state ?? null,
        },
      }),
    ]);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return "account_in_use";
    }
    throw error;
  }

  return "linked";
}
