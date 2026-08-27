import type { Account } from "next-auth";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { DEVICE_COOKIE, hashDeviceToken } from "@/lib/seats";

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

/**
 * 조용한 안전망 — 자동 승계 (DESIGN.md "Continuity & identity policy").
 *
 * 익명 기기 정체성(DEVICE_COOKIE → UserDevice → email-less User)으로 묵상을
 * 쌓던 방문자가 Google 로그인을 하면, 새 parallel 계정을 만들지 않고 기존
 * 익명 User에 Google identity를 attach-in-place 한다. signIn 콜백은
 * PrismaAdapter의 getUserByAccount보다 먼저 실행되므로, 여기서 Account를
 * 미리 붙여두면 adapter가 그 익명 User를 찾아 세션을 만든다 — 데이터 이전
 * 없이 그대로 승계된다.
 *
 * 반환값: 승계에 성공해 adapter가 새 계정을 만들 필요가 없으면 true.
 */
export async function succeedAnonymousUserToGoogle(
  account: Account,
  email: string,
): Promise<boolean> {
  if (account.provider !== "google" || !account.providerAccountId) return false;

  const jar = await cookies();
  const deviceToken = jar.get(DEVICE_COOKIE)?.value;
  if (!deviceToken) return false;

  const tokenHash = hashDeviceToken(deviceToken);
  const device = await db.userDevice.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  const anonUser = device?.user;
  if (!anonUser || device?.revokedAt) return false;
  // 이미 연결된 계정이면 승계 대상이 아니다 (설정의 수동 연결 흐름이 담당).
  if (anonUser.email) return false;

  // 이 Google account가 이미 다른 User에 묶여 있으면 건드리지 않는다 —
  // adapter가 기존 연결된 User로 정상 로그인시킨다.
  const existingAccount = await db.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
  });
  if (existingAccount) return false;

  // 같은 이메일을 쓰는 (연결된) 다른 User가 있으면 승계하지 않는다 —
  // 기존 email_in_use 정책이 담당한다.
  const emailOwner = await db.user.findUnique({ where: { email } });
  if (emailOwner && emailOwner.id !== anonUser.id) return false;

  await db.$transaction([
    db.user.update({
      where: { id: anonUser.id },
      data: { email, emailVerified: new Date() },
    }),
    db.account.create({
      data: {
        userId: anonUser.id,
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
  return true;
}
