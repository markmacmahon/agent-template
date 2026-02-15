import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import { PagePagination } from "@/components/page-pagination";

describe("PagePagination", () => {
  it("renders range info text", () => {
    render(
      <PagePagination
        currentPage={1}
        totalPages={5}
        pageSize={10}
        totalItems={50}
      />,
    );

    expect(screen.getByText("1–10 of 50")).toBeInTheDocument();
  });

  it("disables previous buttons on first page", () => {
    render(
      <PagePagination
        currentPage={1}
        totalPages={3}
        pageSize={10}
        totalItems={30}
      />,
    );

    const buttons = screen.getAllByRole("button");
    // First two buttons are first-page and previous-page
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it("disables next buttons on last page", () => {
    render(
      <PagePagination
        currentPage={3}
        totalPages={3}
        pageSize={10}
        totalItems={30}
      />,
    );

    const buttons = screen.getAllByRole("button");
    // Last two buttons are next-page and last-page
    expect(buttons[buttons.length - 1]).toBeDisabled();
    expect(buttons[buttons.length - 2]).toBeDisabled();
  });

  it("enables all buttons on a middle page", () => {
    render(
      <PagePagination
        currentPage={2}
        totalPages={3}
        pageSize={10}
        totalItems={30}
      />,
    );

    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).not.toBeDisabled();
    });
  });

  it("shows zero results text when empty", () => {
    render(
      <PagePagination
        currentPage={1}
        totalPages={0}
        pageSize={10}
        totalItems={0}
      />,
    );

    expect(screen.getByText("0 results")).toBeInTheDocument();
  });

  it("builds correct URLs with custom basePath", () => {
    render(
      <PagePagination
        currentPage={1}
        totalPages={3}
        pageSize={10}
        totalItems={30}
        basePath="/apps"
      />,
    );

    const links = screen.getAllByRole("link");
    const hrefs = links.map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/apps?page=2&size=10");
  });
});
