import { test, expect } from "@playwright/test";

/**
 * E2E: Subscribers page (3-panel layout: subscribers list, threads, conversation).
 * Prerequisites: Docker DB, test user tester1@example.com / Password#99 with at least one app.
 */

async function login(page: import("@playwright/test").Page) {
  await page.goto("/auth/login", { waitUntil: "networkidle" });
  await page.waitForSelector("form", { state: "attached" });
  await page.locator('input[name="username"]').fill("tester1@example.com");
  await page.locator('input[name="password"]').fill("Password#99");
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const form = document.querySelector("form");
    if (form) form.requestSubmit();
  });
  await page.waitForURL("/dashboard", { timeout: 10000 });
}

async function getFirstAppId(
  page: import("@playwright/test").Page,
): Promise<string> {
  await page.goto("/dashboard/apps");
  await page.waitForSelector("table", { timeout: 10000 });
  const firstRow = page.locator("table tbody tr").first();
  const appLink = firstRow.locator('a[href^="/dashboard/apps/"]').first();
  const href = await appLink.getAttribute("href");
  expect(href).toBeTruthy();
  const match = href!.match(/\/apps\/([^/]+)\/?$/);
  expect(match).toBeTruthy();
  return match![1];
}

test.describe("Subscribers Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("subscribers page: navigate from app page shows 3 panels and no errors", async ({
    page,
  }) => {
    await login(page);
    const appId = await getFirstAppId(page);

    await page.goto(`/dashboard/apps/${appId}`);
    await page.waitForSelector("h1", { timeout: 10000 });
    await page.getByTestId("app-view-subscribers-link").click();
    await page.waitForURL(`/dashboard/apps/${appId}/subscribers`);

    await expect(page.getByTestId("subscribers-container")).toBeVisible();
    await expect(page.getByTestId("subscribers-panel")).toBeVisible();
    await expect(page.getByTestId("subscribers-threads-panel")).toBeVisible();
    await expect(page.getByTestId("subscribers-chat-panel")).toBeVisible();
    await expect(page.getByTestId("subscribers-panel-title")).toBeVisible();
    await expect(
      page.getByTestId("subscribers-threads-panel-title"),
    ).toBeVisible();

    // Wait for the subscriber list to finish loading, then verify no API errors
    await page.waitForTimeout(1500);
    const errorText = page
      .getByTestId("subscribers-panel")
      .locator(".text-red-500");
    await expect(errorText).toHaveCount(0);

    await expect(
      page.getByTestId("subscribers-select-subscriber-msg"),
    ).toBeVisible();
    await expect(
      page.getByTestId("subscribers-select-thread-msg"),
    ).toBeVisible();
  });

  test("subscribers page: direct URL shows same layout with no errors", async ({
    page,
  }) => {
    await login(page);
    const appId = await getFirstAppId(page);

    await page.goto(`/dashboard/apps/${appId}/subscribers`);
    await expect(page.getByTestId("subscribers-container")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByTestId("subscribers-panel")).toBeVisible();
    await expect(page.getByTestId("subscribers-threads-panel")).toBeVisible();
    await expect(page.getByTestId("subscribers-chat-panel")).toBeVisible();
    await expect(page.getByTestId("subscribers-search")).toBeVisible();

    // Verify subscriber list loads without API errors
    await page.waitForTimeout(1500);
    const errorText = page
      .getByTestId("subscribers-panel")
      .locator(".text-red-500");
    await expect(errorText).toHaveCount(0);
  });

  test("app page: clicking app name in list opens app page with actions", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/dashboard/apps");
    await page.waitForSelector("table", { timeout: 10000 });

    const firstAppLink = page
      .locator("table tbody tr")
      .first()
      .locator('a[href^="/dashboard/apps/"]')
      .first();
    await firstAppLink.click();

    await expect(page).toHaveURL(/\/dashboard\/apps\/[^/]+$/);
    await expect(page.getByTestId("app-view-subscribers-link")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /chat/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /edit/i }).first(),
    ).toBeVisible();
  });

  test("app page: Edit button navigates to edit page", async ({ page }) => {
    await login(page);
    const appId = await getFirstAppId(page);

    await page.goto(`/dashboard/apps/${appId}`);
    await page.waitForSelector("h1", { timeout: 10000 });
    await page.getByRole("link", { name: /edit/i }).first().click();

    await expect(page).toHaveURL(new RegExp(`/dashboard/apps/${appId}/edit`));
    await expect(
      page.getByRole("heading", { name: /edit app/i }),
    ).toBeVisible();
  });

  test("app edit: Webhook mode shows App ID & Secret and Save app & credentials", async ({
    page,
  }) => {
    await login(page);
    const appId = await getFirstAppId(page);

    await page.goto(`/dashboard/apps/${appId}/edit`);
    await page.waitForSelector("form", { timeout: 10000 });

    await page.getByRole("button", { name: "Webhook" }).click();

    await expect(
      page.getByRole("heading", { name: /app id & secret/i }),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByRole("button", { name: /save app & credentials/i }),
    ).toBeVisible();
  });

  test("app page: Chat link navigates to chat page", async ({ page }) => {
    await login(page);
    const appId = await getFirstAppId(page);

    await page.goto(`/dashboard/apps/${appId}`);
    await page.waitForSelector("h1", { timeout: 10000 });
    await page.getByRole("link", { name: /chat/i }).first().click();

    await expect(page).toHaveURL(new RegExp(`/dashboard/apps/${appId}/chat`));
    await expect(page.getByTestId("chat-container")).toBeVisible({
      timeout: 10000,
    });
  });

  test("subscribers page: scenario demo streams content", async ({ page }) => {
    await login(page);
    const appId = await getFirstAppId(page);

    await page.goto(`/dashboard/apps/${appId}/subscribers`);
    await expect(page.getByTestId("subscribers-container")).toBeVisible({
      timeout: 10000,
    });

    // Select the first subscriber and thread
    const firstSubscriber = page
      .locator('[data-testid^="subscriber-row-"]')
      .first();
    await firstSubscriber.click();
    await page.waitForTimeout(500);
    const firstThread = page
      .locator('[data-testid^="subscriber-thread-"]')
      .first();
    await firstThread.click();

    // Start scenario demo
    const scenarioTrigger = page.getByTestId("subscribers-scenario-select");
    await scenarioTrigger.click();
    await page.getByRole("option", { name: /Customer Support/i }).click();

    await expect(page.getByText(/safety interlock isn't seated/i)).toBeVisible({
      timeout: 20000,
    });
  });
});
