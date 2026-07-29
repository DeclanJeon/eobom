import { describe, it, expect } from "bun:test";
import { computeInputFingerprint, cacheKey } from "../src/lib/story-mirror/cache";
import type { EntryForProfile } from "../src/lib/story-mirror/user-profile";

describe("cache", () => {
  const entries: EntryForProfile[] = [
    { id: "e1", entryDate: "2026-07-20", themes: ["인내"], emotions: ["슬픔"], scriptureRefs: [] },
    { id: "e2", entryDate: "2026-07-22", themes: ["회개"], emotions: ["감사"], scriptureRefs: [] },
  ];

  it("generates consistent fingerprint", () => {
    const fp1 = computeInputFingerprint(entries, "v1.0", "phase-a-v1");
    const fp2 = computeInputFingerprint(entries, "v1.0", "phase-a-v1");
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(16);
  });

  it("different entries produce different fingerprint", () => {
    const fp1 = computeInputFingerprint(entries, "v1.0", "phase-a-v1");
    const fp2 = computeInputFingerprint(
      [{ id: "e3", entryDate: "2026-07-25", themes: ["변화"], emotions: ["희망"], scriptureRefs: [] }],
      "v1.0", "phase-a-v1",
    );
    expect(fp1).not.toBe(fp2);
  });

  it("different corpus version produces different fingerprint", () => {
    const fp1 = computeInputFingerprint(entries, "v1.0", "phase-a-v1");
    const fp2 = computeInputFingerprint(entries, "v2.0", "phase-a-v1");
    expect(fp1).not.toBe(fp2);
  });

  it("cacheKey includes all parts", () => {
    const key = cacheKey("abc123", "v1.0", "phase-a-v1");
    expect(key).toBe("sm:v1.0:phase-a-v1:abc123");
  });
});
