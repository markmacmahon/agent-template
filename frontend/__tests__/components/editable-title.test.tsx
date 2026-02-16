import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EditableTitle } from "@/components/editable-title";

describe("EditableTitle", () => {
  it("shows value and enters edit mode on click", () => {
    const onSave = jest.fn();
    render(<EditableTitle value="My conversation" onSave={onSave} />);

    expect(screen.getByText("My conversation")).toBeInTheDocument();
    fireEvent.click(screen.getByText("My conversation"));
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("My conversation");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("saves on blur when title is non-empty", async () => {
    const onSave = jest.fn();
    render(<EditableTitle value="Original" onSave={onSave} />);

    fireEvent.click(screen.getByText("Original"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Updated title" } });
    await act(async () => {
      fireEvent.blur(input);
    });

    expect(onSave).toHaveBeenCalledWith("Updated title");
  });

  it("reverts and does not save when title is blank on blur", async () => {
    const onSave = jest.fn();
    render(<EditableTitle value="Original" onSave={onSave} />);

    fireEvent.click(screen.getByText("Original"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => {
      fireEvent.blur(input);
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("reverts on Escape", () => {
    const onSave = jest.fn();
    render(<EditableTitle value="Original" onSave={onSave} />);

    fireEvent.click(screen.getByText("Original"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Changed" } });
    act(() => {
      fireEvent.keyDown(input, { key: "Escape" });
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("Original")).toBeInTheDocument();
  });

  it("saves on Enter when non-empty", async () => {
    const onSave = jest.fn();
    render(<EditableTitle value="Original" onSave={onSave} />);

    fireEvent.click(screen.getByText("Original"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "New title" } });
    await act(async () => {
      fireEvent.keyDown(input, { key: "Enter" });
    });

    expect(onSave).toHaveBeenCalledWith("New title");
  });
});
