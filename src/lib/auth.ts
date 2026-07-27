import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { generateUniquePersonalSlug } from "@/lib/slug";
import {
  CLAIM_COOKIE,
  claimSeat,
  ClaimError,
  getSeatBySlug,
  normalizeSeatSlug,
} from "@/lib/seats";

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

async function applyClaimIfNeeded(userId: string, email: string | null | undefined) {
  if (!email) return;
  const slug = await readClaimSlugFromCookie();
  if (!slug) return;
  try {
    await claimSeat(userId, email, slug);
  } catch (e) {
    // leave cookie for /j page to show error
    if (!(e instanceof ClaimError)) {
      console.error("claim on signIn failed", e);
    }
  }
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
    signIn: "/login",
    error: "/login",
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
      }
      return session;
    },
    async signIn({ user }) {
      if (!user.email) return false;
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
      let personalSlug = await generateUniquePersonalSlug(user.email);

      if (claimSlug) {
        const seat = await getSeatBySlug(claimSlug);
        if (seat && seat.status === "unclaimed") {
          // reserve slug on user; claimSeat finalizes seat row
          const taken = await db.user.findFirst({
            where: { personalSlug: claimSlug, NOT: { id: user.id } },
          });
          if (!taken) personalSlug = claimSlug;
        }
      }

      await db.user.update({
        where: { id: user.id },
        data: {
          personalSlug,
          displayName: user.name ?? null,
          profileImageUrl: user.image ?? null,
        },
      });

      if (claimSlug) {
        try {
          await claimSeat(user.id, user.email, claimSlug);
        } catch (e) {
          if (!(e instanceof ClaimError)) console.error(e);
        }
      }
    },
    async signIn({ user }) {
      if (!user?.id || !user.email) return;
      await applyClaimIfNeeded(user.id, user.email);
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
