import { describe, expect, test } from "bun:test";
import {
  CONSENT_AI,
  CONSENT_AI_MESSAGE,
  CONSENT_AI_TAGS_MESSAGE,
  CONSENT_COMMUNITY,
  CONSENT_COMMUNITY_MESSAGE,
  consentAiDeniedBody,
  consentCommunityDeniedBody,
} from "../src/lib/user-preferences";
import {
  SAFETY_BLOCKED,
  SAFETY_BLOCKED_MESSAGE,
  scanSharedReflectionSafety,
  shouldPersistSharedReflection,
} from "../src/lib/together-safety";

describe("consent messages", () => {
  test("AI denied body", () => {
    const b = consentAiDeniedBody();
    expect(b.code).toBe(CONSENT_AI);
    expect(b.error).toBe(CONSENT_AI_MESSAGE);
    expect(consentAiDeniedBody(CONSENT_AI_TAGS_MESSAGE).error).toBe(
      CONSENT_AI_TAGS_MESSAGE,
    );
  });

  test("community denied body", () => {
    const b = consentCommunityDeniedBody();
    expect(b.code).toBe(CONSENT_COMMUNITY);
    expect(b.error).toBe(CONSENT_COMMUNITY_MESSAGE);
  });
});

describe("together safety policy", () => {
  test("blocks phone email crisis and does not persist", () => {
    const phone = scanSharedReflectionSafety("연락처 010-1234-5678 남깁니다.");
    expect(phone.blocked).toBe(true);
    expect(shouldPersistSharedReflection(phone)).toBe(false);

    const email = scanSharedReflectionSafety("mail me@example.com please");
    expect(email.blocked).toBe(true);
    expect(shouldPersistSharedReflection(email)).toBe(false);

    const crisis = scanSharedReflectionSafety("너무 힘들어서 죽고 싶어요");
    expect(crisis.blocked).toBe(true);
    expect(shouldPersistSharedReflection(crisis)).toBe(false);
  });

  test("allows ordinary reflection text", () => {
    const ok = scanSharedReflectionSafety(
      "오늘 시편 앞에서 마음에 평안이 있었습니다. 작은 결단을 남깁니다.",
    );
    expect(ok.blocked).toBe(false);
    expect(shouldPersistSharedReflection(ok)).toBe(true);
  });

  test("safety message constant", () => {
    expect(SAFETY_BLOCKED).toBe("SAFETY_BLOCKED");
    expect(SAFETY_BLOCKED_MESSAGE.length).toBeGreaterThan(10);
  });
});
