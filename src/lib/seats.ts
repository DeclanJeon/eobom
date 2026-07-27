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

/** e01, e13, e100 … (at least 2 digits) */
const SLUG_RE = /^e\d{2,}$/;

export function isSeatSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function normalizeSeatSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

/** Format sequential number: 1 → e01, 14 → e14, 100 → e100 */
export function formatNumberedSlug(n: number): string {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error("invalid seat number");
  }
  return n < 100 ? `e${String(n).padStart(2, "0")}` : `e${n}`;
}

function parseNumberedSlug(slug: string): number | null {
  const m = normalizeSeatSlug(slug).match(/^e(\d+)$/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** Keyring print batch: e01–e13 stay reserved until QR claim. */
export const KEYRING_RESERVED_MAX = 13;

export function isReservedKeyringNumber(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= KEYRING_RESERVED_MAX;
}

/**
 * Next free short slug for general Google signup.
 * - Never takes a slug already owned by a user
 * - Never takes a claimed seat
 * - Never takes reserved keyring seats e01–e13 while unclaimed (QR inventory)
 * - Reuses unclaimed WEB seats (e14+) if present, else creates the next number
 */
export async function allocateNextNumberedSlug(): Promise<string> {
  const [users, seats] = await Promise.all([
    db.user.findMany({
      where: { personalSlug: { startsWith: "e" } },
      select: { personalSlug: true },
    }),
    db.journalSeat.findMany({
      select: { slug: true, status: true, seatCode: true, label: true },
    }),
  ]);

  const owned = new Set<string>();
  for (const u of users) {
    const s = normalizeSeatSlug(u.personalSlug);
    if (s) owned.add(s);
  }

  const seatBySlug = new Map(seats.map((s) => [normalizeSeatSlug(s.slug), s]));

  let max = KEYRING_RESERVED_MAX;
  for (const u of users) {
    const n = parseNumberedSlug(u.personalSlug);
    if (n != null) max = Math.max(max, n);
  }
  for (const s of seats) {
    const n = parseNumberedSlug(s.slug);
    if (n != null) max = Math.max(max, n);
  }

  // Start after keyring block so web users get e14+ while e02–e13 stay for QR.
  for (let n = KEYRING_RESERVED_MAX + 1; n < max + 5000; n += 1) {
    const slug = formatNumberedSlug(n);
    if (owned.has(slug)) continue;
    const seat = seatBySlug.get(slug);
    if (seat?.status === "claimed") continue;
    if (seat?.status === "revoked") continue;
    // unclaimed WEB / missing seat → available
    if (!seat || seat.status === "unclaimed") {
      // never auto-assign reserved keyring range (loop starts at 14 anyway)
      if (isReservedKeyringNumber(n) && seat?.seatCode?.startsWith("KEYRING")) {
        continue;
      }
      return slug;
    }
  }

  throw new Error("failed to allocate numbered slug");
}

/** Ensure the next web signup slot (e14+) exists as an unclaimed seat row. */
export async function ensureNextWebSeatProvisioned(): Promise<string> {
  const slug = await allocateNextNumberedSlug();
  const existing = await db.journalSeat.findUnique({ where: { slug } });
  if (existing) return slug;
  const num = parseNumberedSlug(slug);
  if (num == null) return slug;
  try {
    await db.journalSeat.create({
      data: {
        slug,
        seatCode: `WEB-${String(num).padStart(2, "0")}`,
        label: "web-signup-pool",
        status: "unclaimed",
      },
    });
  } catch {
    // race ok
  }
  return slug;
}

/**
 * Create a claimed seat row for an auto-assigned web signup slug.
 * Idempotent if the seat already belongs to this user.
 */
export async function ensureClaimedSeatForUser(input: {
  userId: string;
  email: string;
  slug: string;
}) {
  const slug = normalizeSeatSlug(input.slug);
  const num = parseNumberedSlug(slug);
  if (num == null) return null;

  const existing = await db.journalSeat.findUnique({ where: { slug } });
  if (existing) {
    if (existing.claimedUserId === input.userId) return existing;
    if (existing.status === "claimed") return existing;
  }

  const seatCode = `WEB-${String(num).padStart(2, "0")}`;
  try {
    if (existing) {
      return await db.journalSeat.update({
        where: { id: existing.id },
        data: {
          status: "claimed",
          claimedUserId: input.userId,
          claimedEmail: input.email,
          claimedAt: new Date(),
        },
      });
    }
    return await db.journalSeat.create({
      data: {
        slug,
        seatCode,
        label: "web-signup",
        status: "claimed",
        claimedUserId: input.userId,
        claimedEmail: input.email,
        claimedAt: new Date(),
      },
    });
  } catch {
    // unique race — ignore
    return db.journalSeat.findUnique({ where: { slug } });
  }
}

export async function getSeatBySlug(slug: string) {
  const s = normalizeSeatSlug(slug);
  if (!s) return null;
  return db.journalSeat.findUnique({
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

export async function provisionSeats(opts?: {
  count?: number;
  prefix?: string;
  force?: boolean;
}) {
  const count = opts?.count ?? 13;
  const prefix = opts?.prefix ?? "e";
  const created: string[] = [];
  const skipped: string[] = [];

  for (let i = 1; i <= count; i += 1) {
    const num = String(i).padStart(2, "0");
    const slug = `${prefix}${num}`;
    const seatCode = `KEYRING-${num}`;
    const existing = await db.journalSeat.findUnique({ where: { slug } });
    if (existing) {
      skipped.push(slug);
      continue;
    }
    await db.journalSeat.create({
      data: {
        slug,
        seatCode,
        status: "unclaimed",
      },
    });
    created.push(slug);
  }

  return { created, skipped, total: count };
}

/**
 * Bind Google user to a pre-provisioned seat slug.
 * Idempotent if already claimed by same user.
 */
export async function claimSeat(
  userId: string,
  email: string,
  rawSlug: string,
) {
  const slug = normalizeSeatSlug(rawSlug);
  if (!slug) throw new ClaimError("invalid");

  return db.$transaction(async (tx) => {
    const seat = await tx.journalSeat.findUnique({ where: { slug } });
    if (!seat) throw new ClaimError("invalid");
    if (seat.status === "revoked") throw new ClaimError("revoked");

    if (seat.status === "claimed") {
      if (seat.claimedUserId === userId) {
        // ensure user slug matches
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

    // free personalSlug if another user somehow holds this slug string
    const slugOwner = await tx.user.findFirst({
      where: { personalSlug: slug, NOT: { id: userId } },
    });
    if (slugOwner) {
      // should not happen for unclaimed seat; block
      throw new ClaimError("already_claimed");
    }

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
