import { describe, expect, test } from "bun:test";
import {
  createKeyringEventToken,
  verifyKeyringEventToken,
} from "../src/lib/keyring-event-token";

process.env.NEXTAUTH_SECRET = "test-keyring-event-secret";

describe("keyring event tokens", () => {
  test("round-trips a seat id", () => {
    const token = createKeyringEventToken("seat-123", 1_000);
    expect(verifyKeyringEventToken(token, 1_001)).toEqual({
      seatId: "seat-123",
      surface: "keyring",
      expiresAt: 1_000 + 60 * 60 * 1000,
    });
  });

  test("rejects malformed signatures without throwing", () => {
    expect(() => verifyKeyringEventToken("a.b", 1_000)).not.toThrow();
    expect(verifyKeyringEventToken("a.b", 1_000)).toBeNull();
  });

  test("rejects expired tokens", () => {
    const token = createKeyringEventToken("seat-123", 1_000);
    expect(verifyKeyringEventToken(token, 1_000 + 60 * 60 * 1000 + 1)).toBeNull();
  });
});
