import { register } from "@/components/actions/register-action";
import { redirect } from "next/navigation";
import { registerRegister, authJwtLogin } from "@/app/clientService";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

const mockCookiesSet = jest.fn();
jest.mock("next/headers", () => ({
  cookies: jest.fn(() => ({
    set: mockCookiesSet,
  })),
}));

jest.mock("../../app/clientService", () => ({
  registerRegister: jest.fn(),
  authJwtLogin: jest.fn(),
}));

describe("register action", () => {
  beforeEach(() => {
    mockCookiesSet.mockClear();
  });

  it("on success calls register then login and redirects to dashboard", async () => {
    const formData = new FormData();
    formData.set("email", "a@a.com");
    formData.set("password", "Q12341414#");

    (registerRegister as jest.Mock).mockResolvedValue({});
    (authJwtLogin as jest.Mock).mockResolvedValue({
      data: { access_token: "token" },
    });

    await register({}, formData);

    expect(registerRegister).toHaveBeenCalledWith({
      body: { email: "a@a.com", password: "Q12341414#" },
    });
    expect(authJwtLogin).toHaveBeenCalledWith({
      body: { username: "a@a.com", password: "Q12341414#" },
    });
    expect(mockCookiesSet).toHaveBeenCalledWith("accessToken", "token");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("should return an error if the server call fails and preserve email and password", async () => {
    const formData = new FormData();
    formData.set("email", "a@a.com");
    formData.set("password", "Q12341414#");

    (registerRegister as jest.Mock).mockResolvedValue({
      error: {
        detail: "REGISTER_USER_ALREADY_EXISTS",
      },
    });

    const result = await register({}, formData);

    expect(registerRegister).toHaveBeenCalledWith({
      body: {
        email: "a@a.com",
        password: "Q12341414#",
      },
    });
    expect(result).toEqual({
      server_validation_error: "REGISTER_USER_ALREADY_EXISTS",
      email: "a@a.com",
      password: "Q12341414#",
    });
  });

  it("should return validation errors and preserve email and password when form is invalid", async () => {
    const formData = new FormData();
    formData.set("email", "email");
    formData.set("password", "invalid_password");

    const result = await register({}, formData);

    expect(result).toEqual({
      errors: {
        email: ["Invalid email address"],
        password: [
          "Password should contain at least one uppercase letter.",
          "Password should contain at least one special character.",
        ],
      },
      email: "email",
      password: "invalid_password",
    });
    expect(registerRegister).not.toHaveBeenCalled();
  });

  it("should handle unexpected errors and return server error with preserved values", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    // Mock the registerRegister to throw an error
    const mockError = new Error("Network error");
    (registerRegister as jest.Mock).mockRejectedValue(mockError);

    const formData = new FormData();
    formData.append("email", "testuser@example.com");
    formData.append("password", "Password123#");

    const result = await register(undefined, formData);

    expect(result).toEqual({
      server_error: "An unexpected error occurred. Please try again later.",
      email: "testuser@example.com",
      password: "Password123#",
    });
    expect(consoleSpy).toHaveBeenCalledWith("Registration error:", mockError);

    consoleSpy.mockRestore();
  });
});
