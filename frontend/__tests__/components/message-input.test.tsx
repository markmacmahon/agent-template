import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MessageInput } from "@/components/chat/message-input";

describe("MessageInput", () => {
  it("renders textarea and send button", () => {
    render(<MessageInput onSendMessage={jest.fn()} disabled={false} />);

    expect(screen.getByPlaceholderText(/send a message/i)).toBeInTheDocument();
    expect(screen.getByTestId("send-button")).toBeInTheDocument();
  });

  it("calls onSendMessage when send button is clicked", async () => {
    const onSendMessage = jest.fn();

    render(<MessageInput onSendMessage={onSendMessage} disabled={false} />);

    const textarea = screen.getByPlaceholderText(/send a message/i);
    const sendButton = screen.getByTestId("send-button");

    fireEvent.change(textarea, { target: { value: "Hello world" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith("Hello world");
    });
  });

  it("clears input after sending message", async () => {
    const onSendMessage = jest.fn();

    render(<MessageInput onSendMessage={onSendMessage} disabled={false} />);

    const textarea = screen.getByPlaceholderText(
      /send a message/i,
    ) as HTMLTextAreaElement;
    const sendButton = screen.getByTestId("send-button");

    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(textarea.value).toBe("");
    });
  });

  it("sends message when Enter key is pressed (without Shift)", async () => {
    const onSendMessage = jest.fn();

    render(<MessageInput onSendMessage={onSendMessage} disabled={false} />);

    const textarea = screen.getByPlaceholderText(/send a message/i);

    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith("Test message");
    });
  });

  it("does not send when Enter is pressed with Shift", () => {
    const onSendMessage = jest.fn();

    render(<MessageInput onSendMessage={onSendMessage} disabled={false} />);

    const textarea = screen.getByPlaceholderText(/send a message/i);

    fireEvent.change(textarea, { target: { value: "Test message" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("disables send button when disabled prop is true", () => {
    render(<MessageInput onSendMessage={jest.fn()} disabled={true} />);

    const sendButton = screen.getByTestId("send-button");
    expect(sendButton).toBeDisabled();
  });

  it("does not send empty messages", () => {
    const onSendMessage = jest.fn();

    render(<MessageInput onSendMessage={onSendMessage} disabled={false} />);

    const sendButton = screen.getByTestId("send-button");

    fireEvent.click(sendButton);

    expect(onSendMessage).not.toHaveBeenCalled();
  });

  it("shows stop button when streaming with onStop provided", () => {
    const onStop = jest.fn();

    render(
      <MessageInput
        onSendMessage={jest.fn()}
        disabled={true}
        onStop={onStop}
      />,
    );

    const stopButton = screen.getByTestId("stop-button");
    expect(stopButton).toBeInTheDocument();

    fireEvent.click(stopButton);
    expect(onStop).toHaveBeenCalled();
  });
});
