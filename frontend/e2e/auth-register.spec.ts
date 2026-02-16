import { test, expect } from "@playwright/test";

/**
 * E2E: Registration flow
 * - Invalid data: form values are preserved, errors shown
 * - Valid registration: auto-login and redirect to dashboard (no re-entry of credentials)
 *
 * Prerequisites: Docker DB running. Backend and frontend started by Playwright.
 */

test.describe("Registration", () => {
  test("preserves email and password when validation fails", async ({
    page,
  }) => {
    await page.goto("/auth/register", { waitUntil: "networkidle" });
    await page.waitForSelector("form", { state: "attached" });

    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');

    await emailInput.fill("valid@example.com");
    await passwordInput.fill("weak");
    await page.locator('button[type="submit"]').click();

    await expect(
      page.getByText("Password should contain at least one uppercase letter."),
    ).toBeVisible({ timeout: 5000 });
    await expect(emailInput).toHaveValue("valid@example.com");
    await expect(passwordInput).toHaveValue("weak");
  });

  test("after successful registration redirects to dashboard without login page", async ({
    page,
  }) => {
    const uniqueEmail = `e2e-${Date.now()}@nexo.xyz`;
    const password = "NexoPass#99";

    await page.goto("/auth/register", { waitUntil: "networkidle" });
    await page.waitForSelector("form", { state: "attached" });

    await page.locator('input[name="email"]').fill(uniqueEmail);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });
});
