import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";

const mockPathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const mockPageTitle = jest.fn();
jest.mock("../../components/breadcrumb-context", () => ({
  usePageTitle: () => ({
    pageTitle: mockPageTitle(),
    setPageTitle: jest.fn(),
  }),
}));

describe("DashboardBreadcrumb", () => {
  beforeEach(() => {
    mockPageTitle.mockReturnValue(undefined);
  });

  it("renders only Dashboard on /dashboard", () => {
    mockPathname.mockReturnValue("/dashboard");
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("renders Dashboard > Apps on /dashboard/apps", () => {
    mockPathname.mockReturnValue("/dashboard/apps");
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
  });

  it('renders "New App" breadcrumb on /dashboard/apps/new', () => {
    mockPathname.mockReturnValue("/dashboard/apps/new");
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("New App")).toBeInTheDocument();
  });

  it("renders app name breadcrumb on edit page from context", () => {
    mockPathname.mockReturnValue(
      "/dashboard/apps/123e4567-e89b-12d3-a456-426614174000/edit",
    );
    mockPageTitle.mockReturnValue("My Cool App");
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("My Cool App")).toBeInTheDocument();
  });

  it('falls back to "Edit App" on edit page when no context title', () => {
    mockPathname.mockReturnValue(
      "/dashboard/apps/123e4567-e89b-12d3-a456-426614174000/edit",
    );
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("Edit App")).toBeInTheDocument();
  });

  it("makes Dashboard a link back to /dashboard", () => {
    mockPathname.mockReturnValue("/dashboard/apps");
    render(<DashboardBreadcrumb />);

    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });

  it("makes Apps a link back to /dashboard/apps", () => {
    mockPathname.mockReturnValue("/dashboard/apps/new");
    render(<DashboardBreadcrumb />);

    const appsLink = screen.getByText("Apps").closest("a");
    expect(appsLink).toHaveAttribute("href", "/dashboard/apps");
  });

  it("renders the last breadcrumb item as non-link (current page)", () => {
    mockPathname.mockReturnValue("/dashboard/apps/new");
    render(<DashboardBreadcrumb />);

    const newAppEl = screen.getByText("New App");
    expect(newAppEl).toHaveAttribute("aria-current", "page");
  });
});
