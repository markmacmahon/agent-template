import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import ChatPage from "@/app/dashboard/apps/[id]/chat/page";

// Mock the ChatContainer component
jest.mock("../../components/chat/chat-container", () => ({
  ChatContainer: ({ appId }: { appId: string }) => (
    <div data-testid="chat-container">Chat for app {appId}</div>
  ),
}));

// Mock server actions that call cookies()
jest.mock("../../components/actions/chat-actions", () => ({
  fetchThreads: jest.fn().mockResolvedValue({ data: { items: [] } }),
  fetchCurrentUserId: jest.fn().mockResolvedValue({ data: "test-user-id" }),
}));

jest.mock("../../components/actions/apps-action", () => ({
  fetchAppById: jest
    .fn()
    .mockResolvedValue({ data: { id: "test-app-id", name: "Test App" } }),
}));

describe("ChatPage", () => {
  it("renders the chat container with correct app ID", async () => {
    const params = Promise.resolve({ id: "test-app-id" });

    const page = await ChatPage({ params });
    render(page);

    expect(screen.getByTestId("chat-container")).toBeInTheDocument();
    expect(screen.getByText("Chat for app test-app-id")).toBeInTheDocument();
  });
});
