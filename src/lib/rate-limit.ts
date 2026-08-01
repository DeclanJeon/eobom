export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

type BucketState = number[];

const buckets = new Map<string, BucketState>();

export const RATE_LIMITED = "RATE_LIMITED" as const;

export const RATE_LIMITED_MESSAGE =
  "요청이 잠시 많았습니다. 잠시 후 다시 시도해 주세요.";

/**
 * In-process sliding-window rate limit.
 * Suitable for single-instance deploy; resets on process restart.
 */
export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number; now?: number },
): RateLimitResult {
  const now = opts.now ?? Date.now();
  const windowMs = opts.windowMs;
  const limit = opts.limit;
  if (limit <= 0 || windowMs <= 0) {
    return { ok: true, remaining: 0 };
  }

  const cutoff = now - windowMs;
  const prev = buckets.get(key) ?? [];
  const active = prev.filter((t) => t > cutoff);

  if (active.length >= limit) {
    const oldest = active[0] ?? now;
    const retryAfterSec = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    buckets.set(key, active);
    return { ok: false, retryAfterSec };
  }

  active.push(now);
  buckets.set(key, active);
  return { ok: true, remaining: Math.max(0, limit - active.length) };
}

export function resetRateLimitForTests() {
  buckets.clear();
}

export function rateLimitedBody(retryAfterSec: number) {
  return {
    error: RATE_LIMITED_MESSAGE,
    code: RATE_LIMITED as typeof RATE_LIMITED,
    retryAfterSec,
  };
}

/** Common window: 1 hour */
export const HOUR_MS = 60 * 60 * 1000;

export const RATE_LIMITS = {
  reviewsCreate: { limit: 5, windowMs: HOUR_MS },
  togetherCreate: { limit: 20, windowMs: HOUR_MS },
  togetherTags: { limit: 30, windowMs: HOUR_MS },
  uploads: { limit: 40, windowMs: HOUR_MS },
  contact: { limit: 10, windowMs: HOUR_MS },
  visualizationGenerate: { limit: 10, windowMs: HOUR_MS },
  ragStream: { limit: 30, windowMs: HOUR_MS },
} as const;
