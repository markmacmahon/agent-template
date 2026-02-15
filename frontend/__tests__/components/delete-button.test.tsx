import { render } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import "@testing-library/jest-dom";

import { DeleteButton } from "@/app/dashboard/apps/delete-button";
import { removeApp } from "@/components/actions/apps-action";
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

jest.mock("../../components/actions/apps-action", () => ({
  removeApp: jest.fn(),
}));

function renderInMenu(appId: string) {
  return render(
    <DropdownMenu open>
      <DropdownMenuContent>
        <DeleteButton appId={appId} />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

describe("DeleteButton", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders a delete menu item", () => {
    renderInMenu("test-id-123");

    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls removeApp with the correct appId on click", async () => {
    (removeApp as jest.Mock).mockResolvedValue({});

    renderInMenu("test-id-456");

    const deleteItem = screen.getByText("Delete");
    fireEvent.click(deleteItem);

    await waitFor(() => {
      expect(removeApp).toHaveBeenCalledWith("test-id-456");
    });
  });
});
