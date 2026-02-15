import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThreadList } from "@/components/thread-list";

describe("ThreadList", () => {
  const mockThreads = [
    {
      id: "thread-1",
      app_id: "app-1",
      title: "Customer Support #1",
      status: "active" as const,
      customer_id: "customer-123",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:30:00Z",
    },
    {
      id: "thread-2",
      app_id: "app-1",
      title: "Sales Inquiry #2",
      status: "active" as const,
      customer_id: "customer-456",
      created_at: "2024-01-14T09:00:00Z",
      updated_at: "2024-01-14T09:15:00Z",
    },
  ];

  const defaultProps = {
    threads: mockThreads,
    selectedThreadId: null as string | null,
    onThreadSelect: jest.fn(),
    onThreadTitleChange: jest.fn(),
  };

  it("renders thread list with titles", () => {
    render(<ThreadList {...defaultProps} />);

    expect(screen.getByText("Customer Support #1")).toBeInTheDocument();
    expect(screen.getByText("Sales Inquiry #2")).toBeInTheDocument();
  });

  it("highlights the selected thread", () => {
    render(<ThreadList {...defaultProps} selectedThreadId="thread-1" />);

    const selectedRow = screen
      .getByText("Customer Support #1")
      .closest('[role="button"]');
    expect(selectedRow).toHaveClass("bg-accent");
  });

  it("calls onThreadSelect when row (e.g. customer id area) is clicked", () => {
    const onThreadSelect = jest.fn();

    render(<ThreadList {...defaultProps} onThreadSelect={onThreadSelect} />);

    fireEvent.click(screen.getByText("customer-456"));
    expect(onThreadSelect).toHaveBeenCalledWith("thread-2");
  });

  it("renders empty state when no threads and no placeholder", () => {
    render(
      <ThreadList
        threads={[]}
        selectedThreadId={null}
        onThreadSelect={jest.fn()}
        onThreadTitleChange={jest.fn()}
      />,
    );

    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
  });

  it("shows New conversation at top when showNewConversationAtTop is true and no threads", () => {
    render(
      <ThreadList
        threads={[]}
        selectedThreadId={null}
        showNewConversationAtTop={true}
        onThreadSelect={jest.fn()}
        onThreadTitleChange={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId("thread-list-new-conversation"),
    ).toBeInTheDocument();
    expect(screen.getByText(/new conversation/i)).toBeInTheDocument();
    expect(screen.queryByText(/no conversations yet/i)).not.toBeInTheDocument();
  });

  it("shows New conversation at top then existing threads when showNewConversationAtTop", () => {
    render(
      <ThreadList
        threads={mockThreads}
        selectedThreadId={null}
        showNewConversationAtTop={true}
        onThreadSelect={jest.fn()}
        onThreadTitleChange={jest.fn()}
      />,
    );

    const newConvRow = screen.getByTestId("thread-list-new-conversation");
    expect(newConvRow).toHaveTextContent(/new conversation/i);
    // List order: new conversation first, then threads (thread rows are div[role=button], not inner buttons)
    const listContainer = newConvRow.parentElement;
    expect(listContainer).not.toBeNull();
    const listRows = Array.from(listContainer!.children).filter(
      (el) => el.getAttribute("role") === "button",
    );
    expect(listRows.length).toBe(3);
    expect(listRows[0]).toBe(newConvRow);
    expect(listRows[1]).toHaveTextContent("Customer Support #1");
    expect(listRows[2]).toHaveTextContent("Sales Inquiry #2");
  });

  it("calls onThreadSelect(null) when New conversation row is clicked", () => {
    const onThreadSelect = jest.fn();

    render(
      <ThreadList
        threads={[]}
        selectedThreadId={null}
        showNewConversationAtTop={true}
        onThreadSelect={onThreadSelect}
        onThreadTitleChange={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId("thread-list-new-conversation"));
    expect(onThreadSelect).toHaveBeenCalledWith(null);
  });

  it("highlights New conversation row when selectedThreadId is null and placeholder shown", () => {
    render(
      <ThreadList
        threads={mockThreads}
        selectedThreadId={null}
        showNewConversationAtTop={true}
        onThreadSelect={jest.fn()}
        onThreadTitleChange={jest.fn()}
      />,
    );

    const newConvRow = screen.getByTestId("thread-list-new-conversation");
    expect(newConvRow).toHaveClass("bg-accent");
  });
});
