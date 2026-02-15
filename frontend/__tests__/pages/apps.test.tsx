import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import AppsPage from "@/app/dashboard/apps/page";
import { fetchApps } from "@/components/actions/apps-action";

jest.mock("../../components/actions/apps-action", () => ({
  fetchApps: jest.fn(),
  removeApp: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: jest
    .fn()
    .mockReturnValue(new URLSearchParams("page=1&size=10")),
  usePathname: jest.fn().mockReturnValue("/dashboard/apps"),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

const mockFetchApps = fetchApps as jest.Mock;

describe("Apps Page", () => {
  const defaultSearchParams = Promise.resolve({});

  it("renders the apps table on success", async () => {
    mockFetchApps.mockResolvedValue({
      data: {
        items: [
          { id: "1", name: "App One", description: "First app" },
          { id: "2", name: "App Two", description: "Second app" },
        ],
        total: 2,
      },
    });

    const page = await AppsPage({ searchParams: defaultSearchParams });
    render(page);

    expect(screen.getByText("App One")).toBeInTheDocument();
    expect(screen.getByText("App Two")).toBeInTheDocument();
  });

  it("renders the Add New App button", async () => {
    mockFetchApps.mockResolvedValue({
      data: { items: [], total: 0 },
    });

    const page = await AppsPage({ searchParams: defaultSearchParams });
    render(page);

    expect(screen.getByText("Add New App")).toBeInTheDocument();
  });

  it("shows 'No results' when there are no apps", async () => {
    mockFetchApps.mockResolvedValue({
      data: { items: [], total: 0 },
    });

    const page = await AppsPage({ searchParams: defaultSearchParams });
    render(page);

    expect(screen.getByText("No results.")).toBeInTheDocument();
  });

  it("renders empty table with toast on API error", async () => {
    mockFetchApps.mockResolvedValue({
      error: "Internal server error",
    });

    const page = await AppsPage({ searchParams: defaultSearchParams });
    render(page);

    expect(screen.getByText("No results.")).toBeInTheDocument();
    expect(screen.getByText("Add New App")).toBeInTheDocument();
  });

  it("renders empty table with toast on missing token", async () => {
    mockFetchApps.mockResolvedValue({
      error: "No access token found",
    });

    const page = await AppsPage({ searchParams: defaultSearchParams });
    render(page);

    expect(screen.getByText("No results.")).toBeInTheDocument();
  });
});
