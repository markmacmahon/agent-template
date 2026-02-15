import { test, expect } from "@playwright/test";

/**
 * E2E Test: Full chat flow with SSE streaming, greeting, sidebar toggle, simulator settings
 *
 * Playwright starts backend + frontend via webServer config when not in CI.
 * Prerequisites: Docker DB running (`docker compose up -d db` from project root).
 * Test user: tester1@example.com / Password#99 (must have at least one app).
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

async function openFirstAppChat(
  page: import("@playwright/test").Page,
): Promise<string> {
  await page.goto("/dashboard/apps");
  await page.waitForSelector("table", { timeout: 10000 });
  const firstDropdownTrigger = page
    .locator("table tbody tr")
    .first()
    .locator('button, [role="button"]')
    .filter({ hasText: "..." });
  await firstDropdownTrigger.click();
  await page.waitForSelector('[role="menu"]', {
    state: "visible",
    timeout: 5000,
  });
  const chatLink = page.locator('a[href*="/chat"]').first();
  const href = await chatLink.getAttribute("href");
  expect(href).toBeTruthy();
  const match = href!.match(/\/apps\/([^/]+)\/chat/);
  expect(match).toBeTruthy();
  const appId = match![1];
  await chatLink.click();
  await page.waitForURL(`/dashboard/apps/${appId}/chat`);
  return appId;
}

test.describe("Chat Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("full chat flow: login → navigate to app → greeting visible → send message → streamed response", async ({
    page,
  }) => {
    await test.step("Login", async () => {
      await login(page);
    });

    await test.step("Navigate to Apps", async () => {
      await page.goto("/dashboard/apps");
      await expect(page.locator("h2")).toContainText(/apps/i);
    });

    await test.step("Navigate to first app's chat", async () => {
      await openFirstAppChat(page);
    });

    await test.step("Greeting visible initially (both simulator scenarios)", async () => {
      await page.waitForSelector('[data-testid="chat-container"]', {
        timeout: 10000,
      });
      const greeting = page.locator('[data-testid="chat-greeting"]');
      await expect(greeting).toBeVisible();
      await expect(greeting).toContainText("Hello there!");
      await expect(greeting).toContainText("How can I help you today?");
    });

    await test.step("Send a test message", async () => {
      const messageInput = page.locator('textarea[placeholder*="message"]');
      await expect(messageInput).toBeVisible();
      await messageInput.fill("Hello, this is a test message");
      await messageInput.press("Enter");
    });

    await test.step("Verify assistant response appears", async () => {
      const assistantMessage = page.locator(
        '[data-testid="message-assistant"]',
      );
      await expect(assistantMessage.first()).toBeVisible({ timeout: 15000 });
      await expect(assistantMessage.first()).toContainText("Echo:", {
        timeout: 10000,
      });
    });
  });

  test("threads sidebar toggle: open and close", async ({ page }) => {
    await login(page);
    await openFirstAppChat(page);

    await page.waitForSelector('[data-testid="chat-container"]', {
      timeout: 10000,
    });
    const sidebarWrapper = page.locator('[data-testid="chat-sidebar-wrapper"]');
    const toggle = page.locator('[data-testid="chat-sidebar-toggle"]');

    await test.step("Sidebar visible by default", async () => {
      await expect(sidebarWrapper).toHaveAttribute("data-state", "open");
      await expect(page.getByText("Conversations")).toBeVisible();
    });

    await test.step("Close sidebar via toggle", async () => {
      await toggle.click();
      await page.waitForTimeout(400);
      await expect(sidebarWrapper).toHaveAttribute("data-state", "closed");
    });

    await test.step("Open sidebar via toggle", async () => {
      await toggle.click();
      await page.waitForTimeout(400);
      await expect(sidebarWrapper).toHaveAttribute("data-state", "open");
      await expect(page.getByText("Conversations")).toBeVisible();
    });
  });

  test("simulator settings: Integration and Simulator type visible on edit app", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/dashboard/apps");
    await page.waitForSelector("table", { timeout: 10000 });

    await test.step("Open first app's edit page", async () => {
      const firstDropdownTrigger = page
        .locator("table tbody tr")
        .first()
        .locator('button, [role="button"]')
        .filter({ hasText: "..." });
      await firstDropdownTrigger.click();
      await page.waitForSelector('[role="menu"]', {
        state: "visible",
        timeout: 5000,
      });
      await page.getByRole("menuitem", { name: "Edit" }).click();
      await expect(page).toHaveURL(/\/dashboard\/apps\/[^/]+\/edit/);
    });

    await test.step("Integration section: Simulator and Webhook options", async () => {
      await expect(
        page.getByRole("heading", { name: /integration/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Simulator" }),
      ).toBeVisible();
      await expect(page.getByRole("button", { name: "Webhook" })).toBeVisible();
    });

    await test.step("Simulator type section when Simulator selected", async () => {
      const simulatorBtn = page.getByRole("button", { name: "Simulator" });
      await simulatorBtn.click();
      await expect(
        page.getByRole("heading", { name: /simulator type/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /generic/i }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /e-commerce/i }),
      ).toBeVisible();
    });
  });

  test("should handle new thread creation automatically", async ({ page }) => {
    await login(page);
    await openFirstAppChat(page);

    await page.waitForSelector('[data-testid="chat-container"]');

    await expect(page.locator("h1")).toContainText(/new conversation/i);

    const messageInput = page.locator('textarea[placeholder*="message"]');
    await messageInput.fill("Auto-create thread test");
    await messageInput.press("Enter");

    await page.waitForTimeout(2000);

    const assistantMessage = page.locator('[data-testid="message-assistant"]');
    await expect(assistantMessage.first()).toBeVisible({ timeout: 15000 });
  });

  test("New conversation: shows placeholder at top when + clicked, no duplicate", async ({
    page,
  }) => {
    await login(page);
    await openFirstAppChat(page);

    await page.waitForSelector('[data-testid="chat-container"]', {
      timeout: 10000,
    });
    await expect(page.getByTestId("chat-sidebar-wrapper")).toHaveAttribute(
      "data-state",
      "open",
    );

    await test.step("Click New conversation (+): list shows one placeholder at top", async () => {
      const newConvButton = page
        .getByTestId("chat-sidebar-wrapper")
        .getByTitle("New conversation");
      await newConvButton.click();
      const placeholder = page.getByTestId("thread-list-new-conversation");
      await expect(placeholder).toBeVisible();
      await expect(placeholder).toContainText(/new conversation/i);
    });

    await test.step("Click + again without sending: still only one placeholder", async () => {
      const newConvButton = page
        .getByTestId("chat-sidebar-wrapper")
        .getByTitle("New conversation");
      await newConvButton.click();
      const placeholders = page.getByTestId("thread-list-new-conversation");
      await expect(placeholders).toHaveCount(1);
    });
  });

  test("New conversation: first message creates thread at top and placeholder is replaced", async ({
    page,
  }) => {
    await login(page);
    await openFirstAppChat(page);

    await page.waitForSelector('[data-testid="chat-container"]', {
      timeout: 10000,
    });

    await test.step("Click + to show New conversation placeholder", async () => {
      await page
        .getByTestId("chat-sidebar-wrapper")
        .getByTitle("New conversation")
        .click();
      await expect(
        page.getByTestId("thread-list-new-conversation"),
      ).toBeVisible();
    });

    await test.step("Send first message: placeholder replaced by real thread at top", async () => {
      const messageInput = page.locator('textarea[placeholder*="message"]');
      await messageInput.fill("First message in new conversation");
      await messageInput.press("Enter");
    });

    await test.step("Assistant reply appears and thread list shows real thread", async () => {
      await expect(
        page.locator('[data-testid="message-assistant"]').first(),
      ).toBeVisible({ timeout: 15000 });
      await expect(
        page.getByTestId("thread-list-new-conversation"),
      ).toHaveCount(0);
      await expect(
        page
          .locator('[data-testid="chat-sidebar-wrapper"] [role="button"]')
          .first(),
      ).toContainText(/new conversation|first message/i);
    });
  });
});
