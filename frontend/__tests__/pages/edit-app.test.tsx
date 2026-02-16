import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import EditAppPage from "@/app/dashboard/apps/[id]/edit/page";
import { fetchAppById } from "@/components/actions/apps-action";

jest.mock("../../components/actions/apps-action", () => ({
  fetchAppById: jest.fn().mockResolvedValue({
    data: {
      id: "app-123",
      name: "Test App",
      description: "Test Description",
      webhook_url: "https://example.com/hook",
      webhook_secret: "••••••",
      config_json: { integration: { mode: "webhook" } },
    },
  }),
  editApp: jest.fn(),
  testWebhook: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

const mockFetchAppById = fetchAppById as jest.Mock;

describe("Edit App Page", () => {
  const defaultParams = Promise.resolve({ id: "app-123" });

  it("renders the page heading", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    expect(screen.getByText("Edit App")).toBeInTheDocument();
  });

  it("renders the form with pre-filled name and description inputs", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    const nameInput = screen.getByLabelText(/app name/i) as HTMLInputElement;
    const descInput = screen.getByLabelText(
      /app description/i,
    ) as HTMLInputElement;

    expect(nameInput).toBeInTheDocument();
    expect(nameInput.value).toBe("Test App");
    expect(descInput).toBeInTheDocument();
    expect(descInput.value).toBe("Test Description");
  });

  it("renders the submit button (Save app & credentials when webhook, else Update App)", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    // Mock app has webhook mode, so button is "Save app & credentials"
    expect(
      screen.getByRole("button", { name: /save app & credentials/i }),
    ).toBeInTheDocument();
  });

  it("has required attributes on inputs", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    expect(screen.getByLabelText(/app name/i)).toBeRequired();
    expect(screen.getByLabelText(/app description/i)).toBeRequired();
  });

  it("renders segmented control with Webhook selected", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    const webhookBtn = screen.getByRole("button", { name: "Webhook" });
    expect(webhookBtn).toBeInTheDocument();
  });

  it("renders webhook URL input with pre-filled value", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    const input = screen.getByLabelText(/webhook url/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe("https://example.com/hook");
  });

  it("renders webhook secret field in webhook mode", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    const secretInput = screen.getByLabelText(
      /webhook secret/i,
    ) as HTMLInputElement;
    expect(secretInput).toBeInTheDocument();
    expect(secretInput.type).toBe("password");
  });

  it("renders generate secret button in webhook mode", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    expect(
      screen.getByRole("button", { name: /generate/i }),
    ).toBeInTheDocument();
  });

  it("renders webhook security section heading", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    expect(screen.getByText("App ID & Secret")).toBeInTheDocument();
  });

  it("renders signature verification tab in webhook contract", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    expect(
      screen.getByRole("button", { name: /signature verification/i }),
    ).toBeInTheDocument();
  });

  it("shows fallback message with back link on error", async () => {
    mockFetchAppById.mockResolvedValueOnce({ error: "NOT_FOUND" });

    const page = await EditAppPage({ params: defaultParams });
    render(page);

    expect(screen.getByText("Could not load app.")).toBeInTheDocument();
    expect(screen.getByText("Back to apps")).toBeInTheDocument();
  });
});
