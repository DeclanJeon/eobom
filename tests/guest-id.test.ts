import { describe, expect, test } from "bun:test";
import { newGuestId } from "../src/lib/guest-id";

describe("guest id utility", () => {
  test("newGuestId는 uuid v4 형식", () => {
    expect(newGuestId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  test("호출마다 고유한 id", () => {
    expect(newGuestId()).not.toBe(newGuestId());
  });
});
