import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import EditAppPage from "@/app/dashboard/apps/[id]/edit/page";
import { fetchAppById } from "@/components/actions/apps-action";

jest.mock("../../components/actions/apps-action", () => ({
  fetchAppById: jest.fn().mockResolvedValue({
    id: "app-123",
    name: "Test App",
    description: "Test Description",
  }),
  editApp: jest.fn(),
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

  it("renders the submit button with update text", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    expect(
      screen.getByRole("button", { name: /update app/i }),
    ).toBeInTheDocument();
  });

  it("has required attributes on inputs", async () => {
    const page = await EditAppPage({ params: defaultParams });
    render(page);

    expect(screen.getByLabelText(/app name/i)).toBeRequired();
    expect(screen.getByLabelText(/app description/i)).toBeRequired();
  });

  it("shows error message when app is not found", async () => {
    mockFetchAppById.mockResolvedValueOnce({ message: "NOT_FOUND" });

    const page = await EditAppPage({ params: defaultParams });
    render(page);

    expect(screen.getByText("App not found.")).toBeInTheDocument();
  });
});
