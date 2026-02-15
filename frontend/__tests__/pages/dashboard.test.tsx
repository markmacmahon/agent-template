import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import DashboardPage from "@/app/dashboard/page";

describe("Dashboard Page", () => {
  it("renders the welcome message", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Welcome to your Dashboard")).toBeInTheDocument();
  });
});
