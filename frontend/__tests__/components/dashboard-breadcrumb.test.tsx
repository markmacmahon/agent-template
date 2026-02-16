import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";

const mockPathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

const mockPageTitle = jest.fn();
const mockExtraSegments = jest.fn();
jest.mock("../../components/dashboard/breadcrumb-context", () => ({
  usePageTitle: () => ({
    pageTitle: mockPageTitle(),
    setPageTitle: jest.fn(),
    extraSegments: mockExtraSegments(),
    setExtraSegments: jest.fn(),
  }),
}));

describe("DashboardBreadcrumb", () => {
  beforeEach(() => {
    mockPageTitle.mockReturnValue(undefined);
    mockExtraSegments.mockReturnValue([]);
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

  it("renders app name and Edit App breadcrumb on edit page from context", () => {
    mockPathname.mockReturnValue(
      "/dashboard/apps/123e4567-e89b-12d3-a456-426614174000/edit",
    );
    mockPageTitle.mockReturnValue("My Cool App");
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("My Cool App")).toBeInTheDocument();
    expect(screen.getByText("Edit App")).toBeInTheDocument();
  });

  it('falls back to app id and "Edit App" on edit page when no context title', () => {
    mockPathname.mockReturnValue(
      "/dashboard/apps/123e4567-e89b-12d3-a456-426614174000/edit",
    );
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(
      screen.getByText("123e4567-e89b-12d3-a456-426614174000"),
    ).toBeInTheDocument();
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

  it("renders app name and Chat on chat page", () => {
    mockPathname.mockReturnValue(
      "/dashboard/apps/123e4567-e89b-12d3-a456-426614174000/chat",
    );
    mockPageTitle.mockReturnValue("My Cool App");
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("My Cool App")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("renders thread title as extra segment on chat page", () => {
    mockPathname.mockReturnValue(
      "/dashboard/apps/123e4567-e89b-12d3-a456-426614174000/chat",
    );
    mockPageTitle.mockReturnValue("My Cool App");
    mockExtraSegments.mockReturnValue([{ label: "Order issue" }]);
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("My Cool App")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
    expect(screen.getByText("Order issue")).toBeInTheDocument();
  });

  it("links app name crumb to app page from chat page", () => {
    mockPathname.mockReturnValue("/dashboard/apps/abc-123/chat");
    mockPageTitle.mockReturnValue("My App");
    render(<DashboardBreadcrumb />);

    const appLink = screen.getByText("My App").closest("a");
    expect(appLink).toHaveAttribute("href", "/dashboard/apps/abc-123");
  });

  it("renders app view page breadcrumb: Dashboard / Apps / App Name", () => {
    mockPathname.mockReturnValue("/dashboard/apps/abc-123");
    mockPageTitle.mockReturnValue("My App");
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("My App")).toBeInTheDocument();
  });

  it("renders edit page with app name linking to app page", () => {
    mockPathname.mockReturnValue("/dashboard/apps/abc-123/edit");
    mockPageTitle.mockReturnValue("My App");
    render(<DashboardBreadcrumb />);

    const appLink = screen.getByText("My App").closest("a");
    expect(appLink).toHaveAttribute("href", "/dashboard/apps/abc-123");
    expect(screen.getByText("Edit App")).toBeInTheDocument();
  });

  it("renders subscribers page: Dashboard / Apps / App Name / Subscribers", () => {
    mockPathname.mockReturnValue("/dashboard/apps/abc-123/subscribers");
    mockPageTitle.mockReturnValue("My App");
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Apps")).toBeInTheDocument();
    expect(screen.getByText("My App")).toBeInTheDocument();
    expect(screen.getByText("Subscribers")).toBeInTheDocument();
  });
});
