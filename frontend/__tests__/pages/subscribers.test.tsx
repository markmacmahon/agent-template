import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SubscribersPage from "@/app/dashboard/apps/[id]/subscribers/page";

jest.mock("../../components/subscribers/subscribers-container", () => ({
  SubscribersContainer: ({
    appId,
    appName,
    initialSubscriberId,
    initialThreadId,
  }: {
    appId: string;
    appName?: string;
    initialSubscriberId?: string;
    initialThreadId?: string;
  }) => (
    <div data-testid="subscribers-container">
      Subscribers {appId} {appName ?? ""} sub={initialSubscriberId ?? ""}{" "}
      thread=
      {initialThreadId ?? ""}
    </div>
  ),
}));

jest.mock("../../components/actions/apps-action", () => ({
  fetchAppById: jest.fn().mockResolvedValue({
    data: { id: "app-1", name: "Test App" },
  }),
}));

describe("SubscribersPage", () => {
  it("renders SubscribersContainer with app id and optional search params", async () => {
    const page = await SubscribersPage({
      params: Promise.resolve({ id: "app-1" }),
      searchParams: Promise.resolve({}),
    });
    render(page);

    expect(screen.getByTestId("subscribers-container")).toBeInTheDocument();
    expect(screen.getByText(/Subscribers app-1 Test App/)).toBeInTheDocument();
  });

  it("passes initialSubscriberId and initialThreadId from searchParams", async () => {
    const page = await SubscribersPage({
      params: Promise.resolve({ id: "app-2" }),
      searchParams: Promise.resolve({
        subscriber: "sub-123",
        thread: "thread-456",
      }),
    });
    render(page);

    expect(screen.getByText(/sub=sub-123/)).toBeInTheDocument();
    expect(screen.getByText(/thread=thread-456/)).toBeInTheDocument();
  });
});
