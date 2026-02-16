import { render } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import "@testing-library/jest-dom";

import Page from "@/app/auth/register/page";
import { register } from "@/components/actions/register-action";

jest.mock("../../components/actions/register-action", () => ({
  register: jest.fn(),
}));

describe("Register Page", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the form with email and password input and submit button", () => {
    render(<Page />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign up/i }),
    ).toBeInTheDocument();
  });

  it("displays success message on successful form submission", async () => {
    // Mock a successful register
    (register as jest.Mock).mockResolvedValue({});

    render(<Page />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "testuser@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "@1231231%a" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const formData = new FormData();
      formData.set("email", "testuser@example.com");
      formData.set("password", "@1231231%a");
      expect(register).toHaveBeenCalledWith(undefined, formData);
    });
  });

  it("displays server validation error if register fails and preserves form values", async () => {
    (register as jest.Mock).mockResolvedValue({
      server_validation_error: "User already exists",
      email: "already@already.com",
      password: "@1231231%a",
    });

    render(<Page />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "already@already.com" } });
    fireEvent.change(passwordInput, { target: { value: "@1231231%a" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("User already exists")).toBeInTheDocument();
    });
    expect(emailInput).toHaveValue("already@already.com");
    expect(passwordInput).toHaveValue("@1231231%a");
  });

  it("displays server error for unexpected errors and preserves form values", async () => {
    (register as jest.Mock).mockResolvedValue({
      server_error: "An unexpected error occurred. Please try again later.",
      email: "test@test.com",
      password: "@1231231%a",
    });

    render(<Page />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "test@test.com" } });
    fireEvent.change(passwordInput, { target: { value: "@1231231%a" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "An unexpected error occurred. Please try again later.",
        ),
      ).toBeInTheDocument();
    });

    expect(emailInput).toHaveValue("test@test.com");
    expect(passwordInput).toHaveValue("@1231231%a");
    const formData = new FormData();
    formData.set("email", "test@test.com");
    formData.set("password", "@1231231%a");
    expect(register).toHaveBeenCalledWith(undefined, formData);
  });

  it("displays validation errors and preserves form values when email and password are invalid", async () => {
    (register as jest.Mock).mockResolvedValue({
      errors: {
        email: ["Invalid email address"],
        password: [
          "Password should contain at least one uppercase letter.",
          "Password should contain at least one special character.",
        ],
      },
      email: "bad@email.com",
      password: "invalid_password",
    });

    render(<Page />);

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign up/i });

    fireEvent.change(emailInput, { target: { value: "bad@email.com" } });
    fireEvent.change(passwordInput, { target: { value: "invalid_password" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(register).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(emailInput).toHaveValue("bad@email.com");
      expect(passwordInput).toHaveValue("invalid_password");
    });
    expect(screen.getByText("Invalid email address")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Password should contain at least one uppercase letter.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Password should contain at least one special character.",
      ),
    ).toBeInTheDocument();
  });
});
