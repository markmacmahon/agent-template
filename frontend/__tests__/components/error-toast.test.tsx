import { render } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "sonner";

import { ErrorToast } from "@/components/dashboard/error-toast";

jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

describe("ErrorToast", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("calls toast.error with the provided message on mount", () => {
    render(<ErrorToast message="Something failed" />);

    expect(toast.error).toHaveBeenCalledWith("Something failed");
  });

  it("renders nothing visible", () => {
    const { container } = render(<ErrorToast message="Error" />);

    expect(container.innerHTML).toBe("");
  });
});
