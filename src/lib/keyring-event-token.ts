import { createHmac, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_MS = 60 * 60 * 1000;

type Payload = { seatId: string; surface: "keyring"; expiresAt: number };

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("NEXTAUTH_SECRET is required for keyring event tokens");
  return value;
}

function sign(encoded: string) {
  return createHmac("sha256", secret()).update(encoded).digest("base64url");
}

export function createKeyringEventToken(seatId: string, now = Date.now()) {
  const payload: Payload = { seatId, surface: "keyring", expiresAt: now + TOKEN_TTL_MS };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyKeyringEventToken(token: string | undefined, now = Date.now()) {
  if (!token) return null;
  const [encoded, provided] = token.split(".");
  if (!encoded || !provided) return null;
  try {
    const expected = sign(encoded);
    const providedBytes = Buffer.from(provided);
    const expectedBytes = Buffer.from(expected);
    if (providedBytes.length !== expectedBytes.length) return null;
    if (!timingSafeEqual(providedBytes, expectedBytes)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as Payload;
    if (payload.surface !== "keyring" || !payload.seatId || payload.expiresAt < now) return null;
    return payload;
  } catch {
    return null;
  }
}
