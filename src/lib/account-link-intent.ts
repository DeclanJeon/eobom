import { createHmac, timingSafeEqual } from "node:crypto";

export const ACCOUNT_LINK_COOKIE = "eobom_account_link_intent";
export const ACCOUNT_LINK_MAX_AGE = 10 * 60;
const TOKEN_TTL_MS = ACCOUNT_LINK_MAX_AGE * 1000;

type Payload = { userId: string; expiresAt: number };

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET is required for account link intents");
  return value;
}

function signature(encoded: string) {
  return createHmac("sha256", secret()).update(encoded).digest("base64url");
}

export function createAccountLinkIntent(userId: string, now = Date.now()) {
  const payload: Payload = { userId, expiresAt: now + TOKEN_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyAccountLinkIntent(token: string | undefined, now = Date.now()) {
  if (!token) return null;
  const [encoded, provided] = token.split(".");
  if (!encoded || !provided || provided.length > 128) return null;

  try {
    const expected = signature(encoded);
    const providedBytes = Buffer.from(provided);
    const expectedBytes = Buffer.from(expected);
    if (providedBytes.length !== expectedBytes.length) return null;
    if (!timingSafeEqual(providedBytes, expectedBytes)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as Payload;
    if (!payload.userId || payload.expiresAt < now) return null;
    return payload;
  } catch {
    return null;
  }
}
