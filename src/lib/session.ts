import { getServerSession } from "next-auth";
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
