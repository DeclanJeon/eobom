import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";

export type SeatStatus = "unclaimed" | "claimed" | "revoked";

export type ClaimErrorCode =
  | "invalid"
  | "already_claimed"
  | "user_has_other_seat"
  | "revoked";

export class ClaimError extends Error {
  code: ClaimErrorCode;
  constructor(code: ClaimErrorCode, message?: string) {
    super(message || code);
    this.code = code;
  }
}

export const CLAIM_COOKIE = "eobom_claim_slug";
export const CLAIM_COOKIE_MAX_AGE = 600;

/** Physical QR keyring inventory: /j/e01 … /j/e10000 */
export const KEYRING_MIN = 1;
export const KEYRING_MAX = 10000;

const WEB_SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const webNano = customAlphabet(WEB_SLUG_ALPHABET, 8);

export function normalizeSeatSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Format keyring number: 1 → e01, 14 → e14, 100 → e100, 10000 → e10000 */
export function formatNumberedSlug(n: number): string {
  if (!Number.isInteger(n) || n < KEYRING_MIN || n > KEYRING_MAX) {
    throw new Error("invalid keyring number");
  }
  if (n < 100) return `e${String(n).padStart(2, "0")}`;
  return `e${n}`;
}

export function parseNumberedSlug(slug: string): number | null {
  const m = normalizeSeatSlug(slug).match(/^e(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** True for keyring addresses e01–e10000 only. */
export function isKeyringSlug(slug: string): boolean {
  const n = parseNumberedSlug(slug);
  return n != null && n >= KEYRING_MIN && n <= KEYRING_MAX;
}

/** @deprecated use isKeyringSlug — kept for call-site compatibility */
export function isSeatSlug(slug: string): boolean {
  return isKeyringSlug(slug);
}

export function isWebUserSlug(slug: string): boolean {
  return /^u[a-z0-9]{8}$/.test(normalizeSeatSlug(slug));
}

/**
 * Unique address for general Google signup (not keyring).
 * Pattern: u + 8 chars, e.g. /j/u3k9m2x7a
 * Never collides with e01–e10000 keyring namespace.
 */
export async function allocateWebUserSlug(): Promise<string> {
  for (let i = 0; i < 24; i += 1) {
    const slug = `u${webNano()}`;
    if (isKeyringSlug(slug)) continue;
    const [userHit, seatHit] = await Promise.all([
      db.user.findUnique({
        where: { personalSlug: slug },
        select: { id: true },
      }),
      db.journalSeat.findUnique({ where: { slug }, select: { id: true } }),
    ]);
    if (!userHit && !seatHit) return slug;
  }
  throw new Error("failed to allocate web user slug");
}

/**
 * @deprecated Web users no longer use eNN. Kept as alias of allocateWebUserSlug
 * so older imports keep working during deploy.
 */
export async function allocateNextNumberedSlug(): Promise<string> {
  return allocateWebUserSlug();
}

export async function getSeatBySlug(slug: string) {
  const s = normalizeSeatSlug(slug);
  if (!s) return null;

  let seat = await db.journalSeat.findUnique({
    where: { slug: s },
    include: {
      claimedUser: {
        select: {
          id: true,
          displayName: true,
          name: true,
          personalSlug: true,
        },
      },
    },
  });

  // Lazy-create keyring inventory row so e01–e10000 work without pre-inserting 10k rows.
  if (!seat && isKeyringSlug(s)) {
    const num = parseNumberedSlug(s)!;
    try {
      await db.journalSeat.create({
        data: {
          slug: s,
          seatCode: `KEYRING-${String(num).padStart(2, "0")}`,
          label: "keyring",
          status: "unclaimed",
        },
      });
    } catch {
      // race: another request created it
    }
    seat = await db.journalSeat.findUnique({
      where: { slug: s },
      include: {
        claimedUser: {
          select: {
            id: true,
            displayName: true,
            name: true,
            personalSlug: true,
          },
        },
      },
    });
  }

  return seat;
}

export async function listSeats() {
  return db.journalSeat.findMany({
    orderBy: { slug: "asc" },
    include: {
      claimedUser: {
        select: { id: true, email: true, displayName: true, name: true },
      },
    },
  });
}

/**
 * Pre-create keyring seats e01…eN (default 13 for physical batch).
 * Does not create all 10000 rows; remaining keyrings are lazy-created on first open/claim.
 */
export async function provisionSeats(opts?: {
  count?: number;
  prefix?: string;
  force?: boolean;
}) {
  const count = Math.min(opts?.count ?? 13, KEYRING_MAX);
  const prefix = opts?.prefix ?? "e";
  if (prefix !== "e") {
    throw new Error("only prefix e is supported for keyring seats");
  }
  const created: string[] = [];
  const skipped: string[] = [];

  for (let i = 1; i <= count; i += 1) {
    const slug = formatNumberedSlug(i);
    const seatCode = `KEYRING-${String(i).padStart(2, "0")}`;
    const existing = await db.journalSeat.findUnique({ where: { slug } });
    if (existing) {
      skipped.push(slug);
      continue;
    }
    await db.journalSeat.create({
      data: {
        slug,
        seatCode,
        label: "keyring",
        status: "unclaimed",
      },
    });
    created.push(slug);
  }

  return { created, skipped, total: count };
}

/**
 * Bind Google user to a keyring seat slug (e01–e10000).
 * Idempotent if already claimed by same user.
 */
export async function claimSeat(
  userId: string,
  email: string,
  rawSlug: string,
) {
  const slug = normalizeSeatSlug(rawSlug);
  if (!slug || !isKeyringSlug(slug)) throw new ClaimError("invalid");

  // Ensure seat row exists (lazy inventory).
  await getSeatBySlug(slug);

  return db.$transaction(async (tx) => {
    const seat = await tx.journalSeat.findUnique({ where: { slug } });
    if (!seat) throw new ClaimError("invalid");
    if (seat.status === "revoked") throw new ClaimError("revoked");

    if (seat.status === "claimed") {
      if (seat.claimedUserId === userId) {
        await tx.user.update({
          where: { id: userId },
          data: {
            personalSlug: slug,
            seatClaimedAt: seat.claimedAt ?? new Date(),
          },
        });
        return seat;
      }
      throw new ClaimError("already_claimed");
    }

    const other = await tx.journalSeat.findFirst({
      where: {
        claimedUserId: userId,
        status: "claimed",
        NOT: { slug },
      },
    });
    if (other) throw new ClaimError("user_has_other_seat");

    // User already has a web slug or another personalSlug that is a different keyring
    const me = await tx.user.findUnique({
      where: { id: userId },
      select: { personalSlug: true },
    });
    if (
      me?.personalSlug &&
      isKeyringSlug(me.personalSlug) &&
      me.personalSlug !== slug
    ) {
      throw new ClaimError("user_has_other_seat");
    }

    const slugOwner = await tx.user.findFirst({
      where: { personalSlug: slug, NOT: { id: userId } },
    });
    if (slugOwner) throw new ClaimError("already_claimed");

    const updated = await tx.journalSeat.update({
      where: { id: seat.id },
      data: {
        status: "claimed",
        claimedUserId: userId,
        claimedEmail: email,
        claimedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        personalSlug: slug,
        seatClaimedAt: new Date(),
      },
    });

    return updated;
  });
}

export async function tryClaimFromSlug(
  userId: string,
  email: string,
  slug: string | null | undefined,
): Promise<{ ok: true; slug: string } | { ok: false; code?: ClaimErrorCode }> {
  if (!slug) return { ok: false };
  try {
    const seat = await claimSeat(userId, email, slug);
    return { ok: true, slug: seat.slug };
  } catch (e) {
    if (e instanceof ClaimError) return { ok: false, code: e.code };
    throw e;
  }
}

export function claimErrorMessage(code: ClaimErrorCode): string {
  switch (code) {
    case "already_claimed":
      return "이 키링 주소는 이미 다른 계정에 연결되어 있습니다.";
    case "user_has_other_seat":
      return "이미 다른 키링 주소에 연결되어 있습니다. 한 계정은 하나의 키링만 사용할 수 있습니다.";
    case "revoked":
      return "이 키링은 더 이상 사용할 수 없습니다.";
    case "invalid":
    default:
      return "유효하지 않은 키링 주소입니다.";
  }
}
