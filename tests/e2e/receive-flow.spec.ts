import { test, expect } from "@playwright/test";

const isBunTestRunner = !!process.versions?.bun;

/**
 * 공개 Receive-first smoke — 인증 없이 실제 라우트를 방문한다.
 * 개인 기록·관리자 경로는 별도 인증 fixture가 필요하므로 여기서는 공개 계약만 고정한다.
 * Bun unit runner가 tests/ 전체를 로드할 때는 Playwright suite를 등록하지 않는다.
 */
if (!isBunTestRunner) {
  test.describe("Receive-first public flow", () => {
    test("guest /today receives the global scripture card without login", async ({ page }) => {
      const response = await page.goto("/today");
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "오늘 함께 읽을 말씀" })).toBeVisible();
      await expect(page.getByRole("button", { name: "기록으로 잇기" })).toBeVisible();
      await expect(page.getByText("최근 기록")).toHaveCount(0);
    });

    test("keyring landing stays public and does not expose private records", async ({ page }) => {
      const response = await page.goto("/j/e01");
      expect(response?.status()).toBe(200);
      const body = await page.locator("body").innerText();
      expect(body).not.toContain("의 묵상기록지");
      expect(body).not.toContain("@test.local");
    });
  });
}
