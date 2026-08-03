import { describe, it, expect } from "bun:test";
import { generateUnsubscribeToken, verifyUnsubscribeToken } from "../src/lib/mail";

describe("unsubscribe token", () => {
  it("generates and verifies a valid token", () => {
    const userId = "user_123";
    const token = generateUnsubscribeToken(userId);
    expect(token).toContain(".");
    expect(verifyUnsubscribeToken(token)).toBe(userId);
  });

  it("rejects invalid token", () => {
    expect(verifyUnsubscribeToken("invalid")).toBeNull();
    expect(verifyUnsubscribeToken("user_123.wronghmac")).toBeNull();
    expect(verifyUnsubscribeToken("")).toBeNull();
  });

  it("rejects tampered token", () => {
    const token = generateUnsubscribeToken("user_123");
    const [id, hmac] = token.split(".");
    const tampered = `${id}.${hmac.slice(0, -1)}x`;
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it("generates different tokens for different users", () => {
    const t1 = generateUnsubscribeToken("user_a");
    const t2 = generateUnsubscribeToken("user_b");
    expect(t1).not.toBe(t2);
    expect(verifyUnsubscribeToken(t1)).toBe("user_a");
    expect(verifyUnsubscribeToken(t2)).toBe("user_b");
  });
});
