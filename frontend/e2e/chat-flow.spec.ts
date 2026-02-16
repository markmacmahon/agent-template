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
  const chatLink = page.getByRole("link", { name: "Chat" }).first();
  const href = await chatLink.getAttribute("href");
  expect(href).toBeTruthy();
  const match = href!.match(/\/apps\/([^/]+)\/chat/);
  expect(match).toBeTruthy();
  const appId = match![1];
  await chatLink.click();
  await page.waitForURL(`/dashboard/apps/${appId}/chat`);
  return appId;
}

async function getFirstAppId(
  page: import("@playwright/test").Page,
): Promise<string> {
  await page.goto("/dashboard/apps");
  await page.waitForSelector("table", { timeout: 10000 });
  const chatLink = page.getByRole("link", { name: "Chat" }).first();
  const href = await chatLink.getAttribute("href");
  expect(href).toBeTruthy();
  const match = href!.match(/\/apps\/([^/]+)\/chat/);
  expect(match).toBeTruthy();
  return match![1];
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

    await test.step("Greeting visible (empty state or first message)", async () => {
      await page.waitForSelector('[data-testid="chat-container"]', {
        timeout: 10000,
      });
      // Greeting appears either as empty-state UI or as first assistant message
      const emptyStateGreeting = page.locator('[data-testid="chat-greeting"]');
      const firstAssistantMessage = page
        .locator('[data-testid="message-assistant"]')
        .first();
      await expect(emptyStateGreeting.or(firstAssistantMessage)).toBeVisible({
        timeout: 5000,
      });
      await expect(
        page.getByText("Hello there!", { exact: false }),
      ).toBeVisible();
      await expect(
        page.getByText("How can I help you today?", { exact: false }),
      ).toBeVisible();
    });

    await test.step("Send a test message", async () => {
      const messageInput = page.getByTestId("chat-message-input");
      await expect(messageInput).toBeVisible();
      await messageInput.fill("Hello, this is a test message");
      await messageInput.press("Enter");
    });

    await test.step("Verify assistant response appears", async () => {
      const assistantMessages = page.locator(
        '[data-testid="message-assistant"]',
      );
      await expect(assistantMessages.first()).toBeVisible({ timeout: 15000 });
      // First assistant message is greeting; the reply (Echo) is the last assistant message
      await expect(assistantMessages.filter({ hasText: "Echo:" })).toBeVisible({
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
      await expect(page.getByTestId("chat-sidebar-title")).toBeVisible();
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
      await expect(page.getByTestId("chat-sidebar-title")).toBeVisible();
    });
  });

  test("simulator settings: Integration and Simulator type visible on edit app", async ({
    page,
  }) => {
    await login(page);

    await test.step("Open first app's edit page", async () => {
      const appId = await getFirstAppId(page);
      await page.goto(`/dashboard/apps/${appId}/edit`);
      await expect(page).toHaveURL(`/dashboard/apps/${appId}/edit`);
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

    await expect(page.getByTestId("chat-header-title")).toContainText(
      /new conversation/i,
    );

    const messageInput = page.getByTestId("chat-message-input");
    await messageInput.fill("Auto-create thread test");
    await messageInput.press("Enter");

    await page.waitForTimeout(2000);

    const assistantMessage = page.locator('[data-testid="message-assistant"]');
    await expect(assistantMessage.first()).toBeVisible({ timeout: 15000 });
  });

  test("New conversation: + creates thread and greeting appears", async ({
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

    await test.step("Click + : new thread created and greeting visible", async () => {
      const newConvButton = page.getByTestId("chat-new-conversation-button");
      await newConvButton.click();
      await expect(
        page.getByText("Hello there! How can I help you today?"),
      ).toBeVisible({ timeout: 10000 });
    });

    await test.step("Thread list shows the new thread (no placeholder)", async () => {
      const threadRows = page
        .getByTestId("chat-sidebar-wrapper")
        .locator("[role='button']");
      await expect(threadRows.first()).toBeVisible();
      await expect(
        page.getByTestId("thread-list-new-conversation"),
      ).toHaveCount(0);
    });
  });

  test("New conversation: send message in new thread gets streamed reply", async ({
    page,
  }) => {
    await login(page);
    await openFirstAppChat(page);

    await page.waitForSelector('[data-testid="chat-container"]', {
      timeout: 10000,
    });

    await test.step("Click + to create new thread with greeting", async () => {
      await page.getByTestId("chat-new-conversation-button").click();
      await expect(
        page.getByText("Hello there! How can I help you today?"),
      ).toBeVisible({ timeout: 10000 });
    });

    await test.step("Send message and get streamed reply", async () => {
      const messageInput = page.getByTestId("chat-message-input");
      await messageInput.fill("First message in new conversation");
      await messageInput.press("Enter");
    });

    await test.step("Assistant reply appears", async () => {
      const assistantMessages = page.locator(
        '[data-testid="message-assistant"]',
      );
      await expect(assistantMessages.first()).toBeVisible({ timeout: 15000 });
      await expect(assistantMessages).toHaveCount(2); // greeting + reply
    });
  });
});
