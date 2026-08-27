import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    trace: "off",
  },
  webServer: {
    command: "node scripts/with-e2e-db.mjs",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // E2E runs against an isolated temp DB (with-e2e-db.mjs mints file:/tmp/e2e-*/e2e.db)
    // so dev DB (db/eobom.db) is never polluted by 5routes fixtures.
  },
});
