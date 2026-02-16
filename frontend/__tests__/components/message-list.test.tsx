import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MessageList } from "@/components/message-list";

// jsdom doesn't provide ResizeObserver, MutationObserver.observe, or scrollTo
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

// scrollTo is used by the new useScroll hook instead of scrollIntoView
Element.prototype.scrollTo =
  jest.fn() as unknown as typeof Element.prototype.scrollTo;

describe("MessageList", () => {
  const mockMessages = [
    {
      id: "msg-1",
      thread_id: "thread-1",
      seq: 1,
      role: "user" as const,
      content: "Hello, I need help with my order",
      content_json: {},
      created_at: "2024-01-15T10:00:00Z",
    },
    {
      id: "msg-2",
      thread_id: "thread-1",
      seq: 2,
      role: "assistant" as const,
      content: "Of course! I'd be happy to help. What's your order number?",
      content_json: {},
      created_at: "2024-01-15T10:01:00Z",
    },
    {
      id: "msg-3",
      thread_id: "thread-1",
      seq: 3,
      role: "user" as const,
      content: "It's ORDER-12345",
      content_json: {},
      created_at: "2024-01-15T10:02:00Z",
    },
  ];

  it("renders all messages in order", () => {
    render(<MessageList messages={mockMessages} />);

    expect(
      screen.getByText("Hello, I need help with my order"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Of course! I'd be happy to help. What's your order number?",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("It's ORDER-12345")).toBeInTheDocument();
  });

  it("distinguishes between user and assistant messages", () => {
    render(<MessageList messages={mockMessages} />);

    const messages = screen.getAllByTestId(/^message-/);
    expect(messages[0]).toHaveAttribute("data-role", "user");
    expect(messages[1]).toHaveAttribute("data-role", "assistant");
    expect(messages[2]).toHaveAttribute("data-role", "user");
  });

  it("renders greeting state when no messages and not loading", () => {
    render(<MessageList messages={[]} />);

    expect(screen.getByText(/hello there/i)).toBeInTheDocument();
    expect(screen.getByText(/how can i help you today/i)).toBeInTheDocument();
  });

  it("does not show greeting when loading messages for thread", () => {
    render(<MessageList messages={[]} messagesLoading={true} />);

    expect(screen.queryByTestId("chat-greeting")).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-messages-loading")).toBeInTheDocument();
    expect(screen.getByText(/loading conversation/i)).toBeInTheDocument();
  });

  it("renders streaming text with cursor", () => {
    render(<MessageList messages={[]} streamingText="I am streaming..." />);

    expect(screen.getByText(/I am streaming/)).toBeInTheDocument();
    expect(screen.getByTestId("message-streaming")).toBeInTheDocument();
  });

  it("shows pending indicator for optimistic message", () => {
    const pendingMessages = [
      {
        id: "pending-1",
        thread_id: "thread-1",
        seq: 99,
        role: "assistant" as const,
        content: "Sending...",
        content_json: {},
        created_at: new Date().toISOString(),
        pending: true,
      },
    ];

    render(<MessageList messages={pendingMessages} />);

    expect(screen.getAllByText(/sending/i).length).toBeGreaterThan(0);
  });

  it("renders retry button when pending message fails", () => {
    const retry = jest.fn();
    const erroredMessage = [
      {
        id: "pending-1",
        thread_id: "thread-1",
        seq: 99,
        role: "assistant" as const,
        content: "Hello",
        content_json: {},
        created_at: new Date().toISOString(),
        error: "Failed",
      },
    ];

    render(
      <MessageList
        messages={erroredMessage}
        onRetryPending={(id) => retry(id)}
      />,
    );

    fireEvent.click(screen.getByText(/retry/i));
    expect(retry).toHaveBeenCalledWith("pending-1");
  });
});
