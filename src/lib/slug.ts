import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";

const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
const nano = customAlphabet(alphabet, 8);

function baseFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 18);
  return cleaned || "user";
}

export async function generateUniquePersonalSlug(email: string): Promise<string> {
  const base = baseFromEmail(email);
  for (let i = 0; i < 12; i += 1) {
    const candidate = i === 0 ? base : `${base}-${nano().slice(0, 4)}`;
    const existing = await db.user.findUnique({
      where: { personalSlug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }
  return `${base}-${nano()}`;
}
