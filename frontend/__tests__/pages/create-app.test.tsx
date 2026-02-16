import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import CreateAppPage from "@/app/dashboard/apps/new/page";

jest.mock("../../components/actions/apps-action", () => ({
  addApp: jest.fn(),
}));

describe("Create App Page", () => {
  it("renders the page heading", () => {
    render(<CreateAppPage />);

    expect(screen.getByText("Create New App")).toBeInTheDocument();
  });

  it("renders the form with name and description inputs", () => {
    render(<CreateAppPage />);

    expect(screen.getByLabelText(/app name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/app description/i)).toBeInTheDocument();
  });

  it("renders segmented control with Simulator selected by default", () => {
    render(<CreateAppPage />);

    const simulatorBtn = screen.getByRole("button", { name: "Simulator" });
    const webhookBtn = screen.getByRole("button", { name: "Webhook" });
    expect(simulatorBtn).toBeInTheDocument();
    expect(webhookBtn).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<CreateAppPage />);

    expect(
      screen.getByRole("button", { name: /create app/i }),
    ).toBeInTheDocument();
  });

  it("has required attributes on name and description", () => {
    render(<CreateAppPage />);

    expect(screen.getByLabelText(/app name/i)).toBeRequired();
    expect(screen.getByLabelText(/app description/i)).toBeRequired();
  });

  it("when Webhook is selected, shows App ID & Secret (optional) section with secret field and Generate", async () => {
    render(<CreateAppPage />);

    await screen.getByRole("button", { name: "Webhook" }).click();

    expect(
      await screen.findByRole("heading", { name: /app id.*secret.*optional/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/enter or generate a secret/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Generate" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create app & save credentials/i }),
    ).toBeInTheDocument();
  });
});
