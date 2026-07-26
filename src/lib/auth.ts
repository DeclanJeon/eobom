import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import { db } from "@/lib/db";
import { generateUniquePersonalSlug } from "@/lib/slug";

const ONE_YEAR = 365 * 24 * 60 * 60;

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
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
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
          session.user.image = dbUser.profileImageUrl || dbUser.image || session.user.image;
        }
        session.user.aiProcessingConsent = dbUser?.aiProcessingConsent ?? false;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (!user.email) return false;
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id || !user.email) return;
      const slug = await generateUniquePersonalSlug(user.email);
      await db.user.update({
        where: { id: user.id },
        data: {
          personalSlug: slug,
          displayName: user.name ?? null,
          profileImageUrl: user.image ?? null,
        },
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
