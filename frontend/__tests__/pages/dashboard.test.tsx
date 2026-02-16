import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import DashboardPage from "@/app/dashboard/page";

describe("Dashboard Page", () => {
  it("renders title and CTA to apps", () => {
    render(<DashboardPage />);
    expect(screen.getByText("Partner Dashboard")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /go to apps/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/dashboard/apps");
  });

  it("renders subtitle describing apps and configuration", () => {
    render(<DashboardPage />);
    expect(
      screen.getByText(/create and manage your apps/i),
    ).toBeInTheDocument();
  });
});
