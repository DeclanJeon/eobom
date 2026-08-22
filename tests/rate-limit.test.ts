import { describe, expect, test, beforeEach } from "bun:test";
import {
  checkRateLimit,
  RATE_LIMITED_MESSAGE,
  RATE_LIMITS,
  resetRateLimitForTests,
  rateLimitedBody,
} from "../src/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitForTests();
  });

  test("allows up to limit within window", async () => {
    const key = "t:a";
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i += 1) {
      const r = await checkRateLimit(key, { limit: 5, windowMs: 60_000, now: t0 + i });
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.remaining).toBe(5 - (i + 1));
    }
    const blocked = await checkRateLimit(key, { limit: 5, windowMs: 60_000, now: t0 + 10 });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  test("resets after window slides", async () => {
    const key = "t:b";
    const t0 = 2_000_000;
    expect((await checkRateLimit(key, { limit: 2, windowMs: 1000, now: t0 })).ok).toBe(true);
    expect((await checkRateLimit(key, { limit: 2, windowMs: 1000, now: t0 + 1 })).ok).toBe(true);
    expect((await checkRateLimit(key, { limit: 2, windowMs: 1000, now: t0 + 2 })).ok).toBe(false);
    // after full window from first hit
    expect((await checkRateLimit(key, { limit: 2, windowMs: 1000, now: t0 + 1001 })).ok).toBe(true);
  });

  test("rateLimitedBody shape", () => {
    const body = rateLimitedBody(12);
    expect(body.code).toBe("RATE_LIMITED");
    expect(body.error).toBe(RATE_LIMITED_MESSAGE);
    expect(body.retryAfterSec).toBe(12);
  });

  test("bible reference limit is set", () => {
    expect(RATE_LIMITS.bibleReference.limit).toBe(120);
    expect(RATE_LIMITS.bibleReference.windowMs).toBe(60_000);
  });
});
