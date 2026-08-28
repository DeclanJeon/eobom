export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number };

type BucketState = number[];

const buckets = new Map<string, BucketState>();
let memoryOps = 0;
const MAX_MEMORY_BUCKETS = 4096;
const STALE_BUCKET_MS = 60 * 60 * 1000;

function pruneMemoryBuckets(now: number): void {
  memoryOps += 1;
  if (memoryOps % 128 !== 0 && buckets.size <= MAX_MEMORY_BUCKETS) return;
  const cutoff = now - STALE_BUCKET_MS;
  for (const [key, state] of buckets) {
    if (!state.some((timestamp) => timestamp > cutoff)) buckets.delete(key);
  }
  if (buckets.size > MAX_MEMORY_BUCKETS) {
    const remove = buckets.size - MAX_MEMORY_BUCKETS;
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      removed += 1;
      if (removed >= remove) break;
    }
  }
}
export const RATE_LIMITED = "RATE_LIMITED" as const;

export const RATE_LIMITED_MESSAGE =
  "요청이 잠시 많았습니다. 잠시 후 다시 시도해 주세요.";

/* ── Redis optional ─────────────────────────────────────────── */
type RedisLike = {
  pipeline(): {
    incr(key: string): unknown;
    pexpire(key: string, ms: number, mode?: string): unknown;
    exec(): Promise<Array<[Error | null, unknown]> | null>;
  };
  pttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number, mode?: string): Promise<number>;
  flushall?(): Promise<unknown>;
};

let redis: RedisLike | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const IORedis = require("ioredis");
  const RedisCtor: unknown =
    (IORedis as unknown as { default?: unknown }).default ?? IORedis;
  const url = process.env.REDIS_URL;
  if (url && typeof RedisCtor === "function") {
    redis = new (RedisCtor as new (url: string) => RedisLike)(url);
  }
} catch {
  redis = null;
}

export function getRedisClient(): RedisLike | null {
  return redis;
}

/**
 * In-process sliding-window rate limit with Redis distributed fallback.
 * - If REDIS_URL env and ioredis available → Redis fixed-window via INCR+PEXPIRE(NX)+PTTL
 * - Else fallback to in-memory Map sliding window (single instance)
 * Resets on process restart when in-memory.
 */
export async function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number; now?: number },
): Promise<RateLimitResult> {
  const windowMs = opts.windowMs;
  const limit = opts.limit;
  if (limit <= 0 || windowMs <= 0) {
    return { ok: true, remaining: 0 };
  }

  // ── Redis path ─────────────────────────────────────────────
  if (redis) {
    const redisKey = `ratelimit:${key}`;
    try {
      const pipe = redis.pipeline();
      pipe.incr(redisKey);
      // NX: only set expiry on first creation, keeps fixed window
      pipe.pexpire(redisKey, windowMs, "NX");
      const res = await pipe.exec();
      // res: [[null, count], [null, pexpireResult]]
      const count = (res?.[0]?.[1] as number) ?? 0;
      if (count > limit) {
        const ttlMs = await redis.pttl(redisKey);
        const retryAfterSec =
          ttlMs > 0 ? Math.max(1, Math.ceil(ttlMs / 1000)) : Math.max(1, Math.ceil(windowMs / 1000));
        return { ok: false, retryAfterSec };
      }
      return { ok: true, remaining: Math.max(0, limit - count) };
    } catch {
      // Redis failure → fallback to memory
    }
  }

  // ── In-memory sliding window fallback ──────────────────────
  const now = opts.now ?? Date.now();
  pruneMemoryBuckets(now);
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
  // best-effort flush redis keys for tests when REDIS_URL present
  // fire-and-forget; ignore errors
  if (redis?.flushall) {
    void redis.flushall().catch(() => {});
  }
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
export const MINUTE_MS = 60 * 1000;

export const RATE_LIMITS = {
  reviewsCreate: { limit: 5, windowMs: MINUTE_MS },
  bibleReference: { limit: 120, windowMs: MINUTE_MS },
  togetherCreate: { limit: 20, windowMs: MINUTE_MS },
  togetherTags: { limit: 30, windowMs: MINUTE_MS },
  uploads: { limit: 40, windowMs: MINUTE_MS },
  contact: { limit: 10, windowMs: MINUTE_MS },
  visualizationGenerate: { limit: 10, windowMs: MINUTE_MS },
  ragStream: { limit: 30, windowMs: MINUTE_MS },
  seatsClaim: { limit: 10, windowMs: MINUTE_MS },
  actionsCreate: { limit: 20, windowMs: MINUTE_MS },
  entriesCreate: { limit: 30, windowMs: MINUTE_MS },
  storyMirrorRuns: { limit: 10, windowMs: MINUTE_MS },
  identity: { limit: 30, windowMs: MINUTE_MS },
  impression: { limit: 60, windowMs: MINUTE_MS },
  moments: { limit: 60, windowMs: MINUTE_MS },
} as const;
