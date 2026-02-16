import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThreadList } from "@/components/chat/thread-list";

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

  it("renders empty state when no threads", () => {
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
});
