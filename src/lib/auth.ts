import type { Account, NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  ACCOUNT_LINK_COOKIE,
  verifyAccountLinkIntent,
} from "@/lib/account-link-intent";
import { accountLinkRedirect, attachGoogleAccountToUser } from "@/lib/account-link";
import {
  CLAIM_COOKIE,
  allocateWebUserSlug,
  claimSeat,
  ClaimError,
  getSeatBySlug,
  isKeyringSlug,
  normalizeSeatSlug,
} from "@/lib/seats";
import { trySendWelcomeEmail } from "@/lib/mail";

const ONE_YEAR = 365 * 24 * 60 * 60;
const useHttps = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

async function readClaimSlugFromCookie(): Promise<string | null> {
  try {
    const jar = await cookies();
    const raw = jar.get(CLAIM_COOKIE)?.value;
    return raw ? normalizeSeatSlug(raw) : null;
  } catch {
    return null;
  }
}

async function applyClaimIfNeeded(
  userId: string,
  email: string | null | undefined,
) {
  if (!email) return;
  const slug = await readClaimSlugFromCookie();
  if (!slug || !isKeyringSlug(slug)) return;
  try {
    const seat = await claimSeat(userId, email, slug);
    // OAuth 재로그인 시 키링 claim → 환영 메일 (중복 방지/로그는 헬퍼가 담당)
    void trySendWelcomeEmail({
      userId,
      email,
      name: "",
      slug: seat.slug,
    });
  } catch (e) {
    if (!(e instanceof ClaimError)) {
      console.error("claim on signIn failed", e);
    }
  }
}

async function readAccountLinkIntent() {
  const jar = await cookies();
  return verifyAccountLinkIntent(jar.get(ACCOUNT_LINK_COOKIE)?.value);
}

async function clearAccountLinkIntent() {
  const jar = await cookies();
  jar.set(ACCOUNT_LINK_COOKIE, "", { path: "/", maxAge: 0 });
}

async function attachGoogleAccountToIdentity(account: Account, email: string) {
  const intent = await readAccountLinkIntent();
  if (!intent) return null;
  return attachGoogleAccountToUser(intent.userId, account, email);
}
export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  session: {
    strategy: "database",
    maxAge: ONE_YEAR,
    updateAge: 24 * 60 * 60,
  },
  useSecureCookies: useHttps,
  cookies: {
    sessionToken: {
      name: useHttps
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useHttps,
        maxAge: ONE_YEAR,
      },
    },
  },
  pages: {
    signIn: "/today",
    error: "/today",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            personalSlug: true,
            displayName: true,
            name: true,
            image: true,
            profileImageUrl: true,
            aiProcessingConsent: true,
            communityEnabled: true,
            pastTodayEnabled: true,
          },
        });
        session.user.personalSlug = dbUser?.personalSlug ?? "";
        session.user.displayName =
          dbUser?.displayName || dbUser?.name || session.user.name || "";
        if (dbUser?.profileImageUrl || dbUser?.image) {
          session.user.image =
            dbUser.profileImageUrl || dbUser.image || session.user.image;
        }
        session.user.aiProcessingConsent = dbUser?.aiProcessingConsent ?? false;
        session.user.communityEnabled = dbUser?.communityEnabled ?? false;
        session.user.pastTodayEnabled = dbUser?.pastTodayEnabled !== false;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (!user.email) return false;
      if (account?.provider === "google") {
        const linkResult = await attachGoogleAccountToIdentity(account, user.email);
        if (linkResult) {
          await clearAccountLinkIntent();
          return accountLinkRedirect(linkResult);
        }
      }
      return true;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const target = new URL(url);
        if (target.origin === baseUrl) return url;
      } catch {
        // fall through
      }
      return baseUrl;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const claimSlug = await readClaimSlugFromCookie();
      let personalSlug: string | null = null;
      let viaKeyring = false;

      // Keyring QR only: e01–e10000 when still free.
      // claimSeat를 먼저 수행 — 성공 시에만 personalSlug를 확정한다.
      // (순서를 뒤집으면 race 패배 시 타인 키링이 personalSlug로 남아
      //  영구 claim lockout + 불변식 위반이 발생한다.)
      if (claimSlug && isKeyringSlug(claimSlug)) {
        const seat = await getSeatBySlug(claimSlug);
        if (seat && seat.status === "unclaimed") {
          const taken = await db.user.findFirst({
            where: { personalSlug: claimSlug, NOT: { id: user.id } },
          });
          if (!taken) {
            try {
              await claimSeat(user.id, user.email, claimSlug);
              // OAuth 신규 가입 시 키링 claim → 환영 메일 (중복 방지/로그는 헬퍼가 담당)
              if (user.email) {
                void trySendWelcomeEmail({
                  userId: user.id,
                  email: user.email,
                  name: user.name || "",
                  slug: claimSlug,
                });
              }
              personalSlug = claimSlug;
              viaKeyring = true;
            } catch (e) {
              if (!(e instanceof ClaimError)) {
                console.error("signup keyring claim", e);
              }
              // already_claimed 등: 키링 확정 실패 → 아래에서 웹 주소로 폴백
            }
          }
        }
      }

      // General Google signup: unique web address (u + 8 chars), never eNN.
      if (!personalSlug) {
        personalSlug = await allocateWebUserSlug();
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          personalSlug,
          displayName: user.name ?? null,
          profileImageUrl: user.image ?? null,
          seatClaimedAt: viaKeyring ? new Date() : null,
        },
      });
    },
    async signIn({ user }) {
      if (!user?.id || !user.email) return;
      await applyClaimIfNeeded(user.id, user.email);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
