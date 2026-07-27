import { cookies } from "next/headers";
import {
  CLAIM_COOKIE,
  CLAIM_COOKIE_MAX_AGE,
  isSeatSlug,
  normalizeSeatSlug,
} from "@/lib/seats";

export async function setClaimSlugCookie(slug: string) {
  const s = normalizeSeatSlug(slug);
  if (!isSeatSlug(s) && !s.match(/^[a-z0-9-]{2,32}$/)) return;
  const jar = await cookies();
  jar.set(CLAIM_COOKIE, s, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
    path: "/",
    maxAge: CLAIM_COOKIE_MAX_AGE,
  });
}

export async function getClaimSlugCookie(): Promise<string | null> {
  const jar = await cookies();
  const v = jar.get(CLAIM_COOKIE)?.value;
  if (!v) return null;
  return normalizeSeatSlug(v);
}

export async function clearClaimSlugCookie() {
  const jar = await cookies();
  jar.delete(CLAIM_COOKIE);
}
