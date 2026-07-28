import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function requireUser() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

export async function getOptionalUser() {
  const session = await getSession();
  return session?.user ?? null;
}

export type ApiUser = NonNullable<Session["user"]> & { id: string };

/**
 * API routes: 401 JSON instead of redirect.
 */
export async function requireApiUser(): Promise<
  { ok: true; user: ApiUser } | { ok: false; response: NextResponse }
> {
  const session = await getSession();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user: session.user as ApiUser };
}
