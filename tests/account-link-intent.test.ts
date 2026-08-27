import { describe, expect, test } from "bun:test";
import {
  createAccountLinkIntent,
  verifyAccountLinkIntent,
} from "../src/lib/account-link-intent";
import { accountLinkRedirect } from "../src/lib/account-link";

process.env.NEXTAUTH_SECRET = "account-link-test-secret";

describe("account link intents", () => {
  test("round-trips a current identity", () => {
    const token = createAccountLinkIntent("user-1", 1_000);
    expect(verifyAccountLinkIntent(token, 1_001)).toEqual({
      userId: "user-1",
      expiresAt: 601_000,
    });
  });

  test("rejects malformed and expired intents", () => {
    expect(verifyAccountLinkIntent("bad.token", 1_000)).toBeNull();
    const token = createAccountLinkIntent("user-1", 1_000);
    expect(verifyAccountLinkIntent(token, 601_001)).toBeNull();
  });

  test("maps callback results to safe settings redirects", () => {
    expect(accountLinkRedirect("linked")).toBe("/me/settings?linked=1");
    expect(accountLinkRedirect("already_connected")).toBe("/me/settings?linked=1");
    expect(accountLinkRedirect("stale_intent")).toBe("/me/settings?linkError=stale_intent");
    expect(accountLinkRedirect("email_in_use")).toBe("/me/settings?linkError=email_in_use");
    expect(accountLinkRedirect("account_in_use")).toBe("/me/settings?linkError=account_in_use");
  });
});
