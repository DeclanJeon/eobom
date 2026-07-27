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

const SLUG_RE = /^e\d{2}$/;

export function isSeatSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

export function normalizeSeatSlug(slug: string): string {
  return slug.trim().toLowerCase();
}

export async function getSeatBySlug(slug: string) {
  const s = normalizeSeatSlug(slug);
  if (!isSeatSlug(s) && !s) return null;
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
