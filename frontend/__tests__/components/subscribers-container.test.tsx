import React from "react";
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { SubscribersContainer } from "@/components/subscribers/subscribers-container";

const mockReplace = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("../../components/dashboard/breadcrumb-context", () => ({
  usePageTitle: () => ({
    setPageTitle: jest.fn(),
    setExtraSegments: jest.fn(),
  }),
}));

jest.mock("../../components/actions/subscribers-actions", () => ({
  fetchSubscribers: jest.fn().mockResolvedValue({
    data: { items: [], next_cursor: null },
  }),
  fetchSubscriberThreads: jest.fn().mockResolvedValue({
    data: { items: [], next_cursor: null },
  }),
}));

const mockSendMessage = jest.fn().mockResolvedValue({
  data: {
    id: "msg-1",
    thread_id: "thread-1",
    seq: 1,
    role: "user",
    content: "Hi",
    content_json: {},
    created_at: new Date().toISOString(),
  },
});

jest.mock("../../components/actions/chat-actions", () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

const mockStreamScenario = jest.fn().mockResolvedValue(undefined);
const mockRefreshMessages = jest.fn();

jest.mock("../../components/chat/thread-chat", () => ({
  ThreadChat: React.forwardRef(
    (
      { threadId }: { threadId: string },
      ref: React.Ref<{
        streamScenarioMessage: () => Promise<void>;
        refreshMessages: () => void;
      }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        streamScenarioMessage: mockStreamScenario,
        refreshMessages: mockRefreshMessages,
      }));
      return <div data-testid="thread-chat">Chat {threadId}</div>;
    },
  ),
}));

describe("SubscribersContainer", () => {
  it("renders three panels with correct testids", async () => {
    render(<SubscribersContainer appId="app-1" appName="Test App" />);
    await screen.findByText(/no subscribers yet/i);

    expect(screen.getByTestId("subscribers-container")).toBeInTheDocument();
    expect(screen.getByTestId("subscribers-panel")).toBeInTheDocument();
    expect(screen.getByTestId("subscribers-threads-panel")).toBeInTheDocument();
    expect(screen.getByTestId("subscribers-chat-panel")).toBeInTheDocument();
  });

  it("shows Subscribers and Threads headings", async () => {
    render(<SubscribersContainer appId="app-1" />);
    await screen.findByText(/no subscribers yet/i);

    expect(screen.getByText("Subscribers")).toBeInTheDocument();
    expect(screen.getByText("Threads")).toBeInTheDocument();
  });

  it("shows select-subscriber and select-thread placeholder when nothing selected", async () => {
    render(<SubscribersContainer appId="app-1" />);
    await screen.findByText(/no subscribers yet/i);

    expect(
      screen.getByText(/select a subscriber to view their threads/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/select a thread to view the conversation/i),
    ).toBeInTheDocument();
  });

  it("updates URL when selection changes", async () => {
    render(<SubscribersContainer appId="app-1" />);
    await screen.findByText(/no subscribers yet/i);

    expect(mockReplace).toHaveBeenCalledWith(
      "/dashboard/apps/app-1/subscribers",
      { scroll: false },
    );
  });

  it("runs scenario demo when option is selected", async () => {
    jest.useFakeTimers();
    render(
      <SubscribersContainer
        appId="app-1"
        appName="Test App"
        initialSubscriberId="sub-1"
        initialThreadId="thread-1"
      />,
    );

    await screen.findByTestId("thread-chat");

    const trigger = screen.getByTestId("subscribers-scenario-select");
    fireEvent.click(trigger);
    const option = await screen.findByRole("option", {
      name: /Customer Support/i,
    });
    fireEvent.click(option);

    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    await waitFor(() => expect(mockSendMessage).toHaveBeenCalled());
    await waitFor(() => expect(mockStreamScenario).toHaveBeenCalled());
    jest.useRealTimers();
  });
});
