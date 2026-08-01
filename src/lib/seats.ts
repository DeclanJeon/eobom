import { createHash, randomBytes } from "node:crypto";
import { customAlphabet } from "nanoid";
import { db } from "@/lib/db";

/** Keyring device-registration cookie name (httpOnly). */
export const DEVICE_COOKIE = "eobom_device_token";
export const DEVICE_COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1년
/** 활성 기기당 상한 — 초과 시 가장 오래된 기기를 revoke한다. */
export const DEVICE_LIMIT_PER_USER = 5;

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
  const s = slug.trim().toLowerCase();
  // 번호형 키링 slug는 정규형으로 통일 (e1·e00001 → e01) —
  // 별칭 행 생성(팬텀 인벤토리)과 별칭 claim을 차단한다.
  // parseNumberedSlug를 부르지 않는다(상호 재귀 방지).
  const m = s.match(/^e(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    if (Number.isInteger(n) && n >= KEYRING_MIN && n <= KEYRING_MAX) {
      return formatNumberedSlug(n);
    }
  }
  return s;
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

    const updated = await tx.journalSeat.updateMany({
      where: { id: seat.id, status: "unclaimed" },
      data: {
        status: "claimed",
        claimedUserId: userId,
        claimedEmail: email,
        claimedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      // compare-and-set 실패: 다른 트랜잭션이 먼저 claim했다.
      throw new ClaimError("already_claimed");
    }

    await tx.user.update({
      where: { id: userId },
      data: {
        personalSlug: slug,
        seatClaimedAt: new Date(),
      },
    });

    const claimed = await tx.journalSeat.findUnique({ where: { id: seat.id } });
    if (!claimed) throw new ClaimError("invalid");
    return claimed;
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

// ─── Keyring device registration ──────────────────────────────────────────────

/** 32바이트 랜덤 토큰 + SHA-256 해시. DB에는 해시만 저장한다. */
export function generateDeviceToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashDeviceToken(token) };
}

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Cookie 헤더에서 기기 토큰 해시를 추출한다 (토큰 평문은 절대 저장/로그하지 않음). */
export function getDeviceTokenHash(cookieHeader: string | null | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${DEVICE_COOKIE}=`));
  if (!match) return null;
  const token = match.slice(DEVICE_COOKIE.length + 1);
  if (!token) return null;
  return hashDeviceToken(token);
}

/** 해당 사용자의 활성(revoke되지 않은) 기기로 등록된 토큰 해시인지 판별한다. */
export async function isOwnerDevice(
  userId: string,
  tokenHash: string | null | undefined,
): Promise<boolean> {
  if (!tokenHash) return false;
  const device = await db.userDevice.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, revokedAt: true },
  });
  if (!device || device.userId !== userId || device.revokedAt != null) {
    return false;
  }
  // 확인된 기기는 lastSeenAt 갱신 (실패해도 접근 판정에는 영향 없음)
  await db.userDevice
    .updateMany({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});
  return true;
}

/** 기기 토큰을 사용자에게 등록한다. 활성 기기가 상한(5)을 넘으면 가장 오래된 것을 revoke한다. */
export async function registerDevice(
  userId: string,
  token: string,
  label?: string,
) {
  const tokenHash = hashDeviceToken(token);

  return db.$transaction(async (tx) => {
    // SQLite deferred transactions can otherwise let concurrent registrations
    // observe the same activeCount. A no-op UPDATE acquires the per-user row
    // write lock before the count/read-and-evict sequence.
    await tx.$executeRaw`UPDATE "User" SET "updatedAt" = "updatedAt" WHERE "id" = ${userId}`;
    const existing = await tx.userDevice.findUnique({ where: { tokenHash } });
    if (existing) {
      return tx.userDevice.update({
        where: { id: existing.id },
        data: { revokedAt: null, label: label ?? existing.label, lastSeenAt: new Date() },
      });
    }

    const activeCount = await tx.userDevice.count({
      where: { userId, revokedAt: null },
    });
    if (activeCount >= DEVICE_LIMIT_PER_USER) {
      const oldest = await tx.userDevice.findFirst({
        where: { userId, revokedAt: null },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      if (oldest) {
        await tx.userDevice.update({
          where: { id: oldest.id },
          data: { revokedAt: new Date() },
        });
      }
    }

    return tx.userDevice.create({
      data: { userId, tokenHash, label, lastSeenAt: new Date() },
    });
  });
}
