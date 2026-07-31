import { describe, expect, test } from "bun:test";
import {
  buildFingerprintPayload,
  deriveVisualizationFreshness,
  getStoredFingerprint,
  hashFingerprintPayload,
  hasSynthesisInDataJson,
  isCacheHit,
  mergeFingerprintIntoData,
  monthPeriodStart,
  parseVisualizationDataJson,
} from "../src/lib/story-mirror/visualization-fingerprint";

const period = new Date("2026-07-01T00:00:00.000Z");

function baseEntries() {
  return [
    { id: "e1", updatedAt: new Date("2026-07-10T00:00:00.000Z") },
    { id: "e2", updatedAt: new Date("2026-07-09T00:00:00.000Z") },
  ];
}

describe("hashFingerprintPayload / buildFingerprintPayload", () => {
  test("same input → same fingerprint", () => {
    const a = hashFingerprintPayload(
      buildFingerprintPayload({
        periodStart: period,
        review: { id: "r1", structuredOutput: '{"oneSentence":"a"}' },
        entries: baseEntries(),
        entryCount: 2,
      }),
    );
    const b = hashFingerprintPayload(
      buildFingerprintPayload({
        periodStart: period,
        review: { id: "r1", structuredOutput: '{"oneSentence":"a"}' },
        entries: baseEntries(),
        entryCount: 2,
      }),
    );
    expect(a).toBe(b);
    expect(a).toHaveLength(16);
  });

  test("entry updatedAt change → different fingerprint", () => {
    const before = hashFingerprintPayload(
      buildFingerprintPayload({
        periodStart: period,
        review: null,
        entries: baseEntries(),
        entryCount: 2,
      }),
    );
    const after = hashFingerprintPayload(
      buildFingerprintPayload({
        periodStart: period,
        review: null,
        entries: [
          { id: "e1", updatedAt: new Date("2026-07-11T00:00:00.000Z") },
          { id: "e2", updatedAt: new Date("2026-07-09T00:00:00.000Z") },
        ],
        entryCount: 2,
      }),
    );
    expect(after).not.toBe(before);
  });

  test("review structuredOutput change → different fingerprint", () => {
    const before = hashFingerprintPayload(
      buildFingerprintPayload({
        periodStart: period,
        review: { id: "r1", structuredOutput: '{"a":1}' },
        entries: baseEntries(),
        entryCount: 2,
      }),
    );
    const after = hashFingerprintPayload(
      buildFingerprintPayload({
        periodStart: period,
        review: { id: "r1", structuredOutput: '{"a":2}' },
        entries: baseEntries(),
        entryCount: 2,
      }),
    );
    expect(after).not.toBe(before);
  });

  test("entry add/remove → different fingerprint", () => {
    const before = hashFingerprintPayload(
      buildFingerprintPayload({
        periodStart: period,
        review: null,
        entries: baseEntries(),
        entryCount: 2,
      }),
    );
    const after = hashFingerprintPayload(
      buildFingerprintPayload({
        periodStart: period,
        review: null,
        entries: [
          ...baseEntries(),
          { id: "e3", updatedAt: new Date("2026-07-12T00:00:00.000Z") },
        ],
        entryCount: 3,
      }),
    );
    expect(after).not.toBe(before);
  });
});

describe("deriveVisualizationFreshness / isCacheHit", () => {
  test("no image → none", () => {
    expect(
      deriveVisualizationFreshness({
        hasImage: false,
        hasSynthesis: false,
        storedFingerprint: null,
        currentFingerprint: "abc",
      }),
    ).toBe("none");
  });

  test("legacy complete without fp → stale", () => {
    expect(
      deriveVisualizationFreshness({
        hasImage: true,
        hasSynthesis: true,
        storedFingerprint: null,
        currentFingerprint: "abc",
      }),
    ).toBe("stale");
  });

  test("fp match + synthesis → fresh", () => {
    expect(
      deriveVisualizationFreshness({
        hasImage: true,
        hasSynthesis: true,
        storedFingerprint: "abc",
        currentFingerprint: "abc",
      }),
    ).toBe("fresh");
  });

  test("fp mismatch → stale", () => {
    expect(
      deriveVisualizationFreshness({
        hasImage: true,
        hasSynthesis: true,
        storedFingerprint: "old",
        currentFingerprint: "new",
      }),
    ).toBe("stale");
  });

  test("cache hit only when fresh and not forced", () => {
    const args = {
      hasImage: true,
      hasSynthesis: true,
      storedFingerprint: "abc",
      currentFingerprint: "abc",
    };
    expect(isCacheHit(args)).toBe(true);
    expect(isCacheHit({ ...args, force: true })).toBe(false);
    expect(
      isCacheHit({
        ...args,
        storedFingerprint: "old",
      }),
    ).toBe(false);
  });
});

describe("dataJson helpers", () => {
  test("parse / getStored / hasSynthesis / merge", () => {
    expect(parseVisualizationDataJson("{")).toEqual({});
    expect(getStoredFingerprint('{"contentFingerprint":"x"}')).toBe("x");
    expect(hasSynthesisInDataJson('{"synthesis":" hello "}')).toBe(true);
    expect(hasSynthesisInDataJson('{"synthesis":"  "}')).toBe(false);
    const merged = mergeFingerprintIntoData({ synthesis: "s" }, "fp1");
    expect(merged.contentFingerprint).toBe("fp1");
    expect(merged.fingerprintVersion).toBe(1);
  });

  test("monthPeriodStart is first of month local", () => {
    const d = monthPeriodStart(new Date(2026, 6, 31, 15, 0, 0));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(6);
    expect(d.getDate()).toBe(1);
  });
});
