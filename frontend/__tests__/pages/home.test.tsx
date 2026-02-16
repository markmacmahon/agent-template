import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import Home from "@/app/page";

describe("Home Page", () => {
  it("renders the heading", () => {
    render(<Home />);

    expect(
      screen.getByText("Partner Integration Platform"),
    ).toBeInTheDocument();
  });

  it("renders a link to the dashboard", () => {
    render(<Home />);

    const dashboardLink = screen.getByRole("link", {
      name: /go to dashboard/i,
    });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("renders a link to GitHub", () => {
    render(<Home />);

    const githubLink = screen.getByRole("link", { name: /view on github/i });
    expect(githubLink).toBeInTheDocument();
    expect(githubLink).toHaveAttribute(
      "href",
      "https://github.com/markmacmahon/agent-template",
    );
  });

  it("renders the description text", () => {
    render(<Home />);

    expect(
      screen.getByText(
        /build conversational agents that plug into existing chatbots/i,
      ),
    ).toBeInTheDocument();
  });
});
