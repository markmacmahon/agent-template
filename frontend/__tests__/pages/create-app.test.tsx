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

  it("renders the submit button", () => {
    render(<CreateAppPage />);

    expect(
      screen.getByRole("button", { name: /create app/i }),
    ).toBeInTheDocument();
  });

  it("has required attributes on inputs", () => {
    render(<CreateAppPage />);

    expect(screen.getByLabelText(/app name/i)).toBeRequired();
    expect(screen.getByLabelText(/app description/i)).toBeRequired();
  });
});
