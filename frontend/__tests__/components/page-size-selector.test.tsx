import { render } from "@testing-library/react";
import { screen } from "@testing-library/dom";
import "@testing-library/jest-dom";

import { PageSizeSelector } from "@/components/dashboard/page-size-selector";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("PageSizeSelector", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders with the current size displayed", () => {
    render(<PageSizeSelector currentSize={10} />);

    expect(screen.getByText(/items per page/i)).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders the label text", () => {
    render(<PageSizeSelector currentSize={20} />);

    expect(screen.getByText(/items per page/i)).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});
