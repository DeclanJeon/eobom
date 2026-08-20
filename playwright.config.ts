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
    command: "bun run dev",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
