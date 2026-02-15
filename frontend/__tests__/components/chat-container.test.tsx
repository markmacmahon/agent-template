import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ChatContainer } from "@/components/chat-container";
import * as chatActions from "../../components/actions/chat-actions";

// jsdom does not provide ResizeObserver (used by MessageList/useScroll)
const mockResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  unobserve: jest.fn(),
}));
beforeAll(() => {
  global.ResizeObserver = mockResizeObserver;
});
afterAll(() => {
  delete (global as unknown as { ResizeObserver?: unknown }).ResizeObserver;
});

jest.mock("../../components/actions/chat-actions", () => ({
  fetchMessages: jest.fn().mockResolvedValue({ data: [] }),
  sendMessage: jest.fn(),
  createNewThread: jest.fn(),
  updateThreadTitle: jest.fn(),
}));

jest.mock("../../hooks/use-chat-stream", () => ({
  useChatStream: () => ({
    streamingText: "",
    status: "idle",
    startStream: jest.fn(),
    stopStream: jest.fn(),
  }),
}));

jest.mock("../../components/breadcrumb-context", () => ({
  usePageTitle: () => ({
    setPageTitle: jest.fn(),
    setExtraSegments: jest.fn(),
  }),
}));

describe("ChatContainer", () => {
  it("shows New conversation at top of list when New conversation button is clicked", () => {
    render(
      <ChatContainer appId="app-1" appName="Test App" initialThreads={[]} />,
    );

    expect(
      screen.queryByTestId("thread-list-new-conversation"),
    ).not.toBeInTheDocument();

    const newConvButton = screen.getByTitle("New conversation");
    fireEvent.click(newConvButton);

    const newConvRow = screen.getByTestId("thread-list-new-conversation");
    expect(newConvRow).toBeInTheDocument();
    expect(newConvRow).toHaveTextContent(/new conversation/i);
  });

  it("does not duplicate New conversation when button clicked again", () => {
    render(
      <ChatContainer appId="app-1" appName="Test App" initialThreads={[]} />,
    );

    const newConvButton = screen.getByTitle("New conversation");
    fireEvent.click(newConvButton);
    fireEvent.click(newConvButton);

    const placeholders = screen.getAllByTestId("thread-list-new-conversation");
    expect(placeholders).toHaveLength(1);
  });

  it("shows New conversation at top above existing threads when clicked", () => {
    const existingThreads = [
      {
        id: "thread-1",
        app_id: "app-1",
        title: "Existing chat",
        status: "active" as const,
        customer_id: null,
        created_at: "2024-01-15T10:00:00Z",
        updated_at: "2024-01-15T10:30:00Z",
      },
    ];

    render(
      <ChatContainer
        appId="app-1"
        appName="Test App"
        initialThreads={existingThreads}
      />,
    );

    const newConvButton = screen.getByTitle("New conversation");
    fireEvent.click(newConvButton);

    const newConvRow = screen.getByTestId("thread-list-new-conversation");
    const listContainer = newConvRow.parentElement;
    const listRows = Array.from(listContainer!.children).filter(
      (el) => el.getAttribute("role") === "button",
    );
    expect(listRows[0]).toBe(newConvRow);
    expect(screen.getByText("Existing chat")).toBeInTheDocument();
  });

  it("persists thread when user edits and saves New conversation title", async () => {
    const newThread = {
      id: "thread-new-1",
      app_id: "app-1",
      title: "My new chat",
      status: "active" as const,
      customer_id: "customer-123",
      created_at: "2024-01-15T12:00:00Z",
      updated_at: "2024-01-15T12:00:00Z",
    };
    jest
      .mocked(chatActions.createNewThread)
      .mockResolvedValueOnce({ data: newThread });

    render(
      <ChatContainer appId="app-1" appName="Test App" initialThreads={[]} />,
    );
    const newConvButton = screen.getByTitle("New conversation");
    fireEvent.click(newConvButton);
    expect(
      screen.getByTestId("thread-list-new-conversation"),
    ).toBeInTheDocument();

    const header = screen.getByTestId("chat-header");
    const headerTitle = within(header).getByText(/new conversation/i);
    fireEvent.click(headerTitle);
    const input = within(header).getByRole("textbox", {
      name: /click to edit/i,
    });
    fireEvent.change(input, { target: { value: "My new chat" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await within(screen.getByTestId("chat-header")).findByText("My new chat");
    expect(chatActions.createNewThread).toHaveBeenCalledWith(
      "app-1",
      expect.stringMatching(/^customer-\d+-[a-z0-9]+$/),
      "My new chat",
    );
    expect(
      screen.queryByTestId("thread-list-new-conversation"),
    ).not.toBeInTheDocument();
  });
});
