import { test as setup } from "@playwright/test";

const authFile = ".auth/user.json";

setup("authenticate", async ({ page, context }) => {
  // Manually login in a real browser first, then:
  // 1. Open DevTools → Application → Cookies
  // 2. Copy the `accessToken` cookie value
  // 3. Run this setup to save auth state

  await page.goto("/auth/login");

  await page.locator('input[name="username"]').fill("tester@nexo.xyz");
  await page.locator('input[name="password"]').fill("NexoPass#99");

  await page.locator('button[type="submit"]').click();

  // Wait for successful login
  await page.waitForURL("/dashboard", { timeout: 15000 });

  // Save signed-in state
  await context.storageState({ path: authFile });
});
