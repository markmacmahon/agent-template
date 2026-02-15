import {
  fetchApps,
  removeApp,
  addApp,
  fetchAppById,
  editApp,
} from "@/components/actions/apps-action";
import {
  readApp,
  deleteApp,
  createApp,
  getApp,
  updateApp,
} from "@/app/clientService";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

jest.mock("../../app/clientService", () => ({
  readApp: jest.fn(),
  deleteApp: jest.fn(),
  createApp: jest.fn(),
  getApp: jest.fn(),
  updateApp: jest.fn(),
}));

jest.mock("next/headers", () => {
  const mockGet = jest.fn();
  const mockDelete = jest.fn();
  return {
    cookies: jest.fn().mockResolvedValue({ get: mockGet, delete: mockDelete }),
  };
});

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("fetchApps", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns apps data on success", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    const mockData = {
      items: [{ id: "1", name: "App 1", description: "Desc 1" }],
      total: 1,
    };
    (readApp as jest.Mock).mockResolvedValue({ data: mockData });

    const result = await fetchApps(1, 10);

    expect(readApp).toHaveBeenCalledWith({
      query: { page: 1, size: 10 },
      headers: { Authorization: "Bearer test-token" },
    });
    expect(result).toEqual({ data: mockData });
  });

  it("returns error when no access token", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue(undefined);

    const result = await fetchApps();

    expect(readApp).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "No access token found" });
  });

  it("returns error message on API failure", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    const mockError = "FORBIDDEN";
    (readApp as jest.Mock).mockResolvedValue({ error: mockError });

    const result = await fetchApps();

    expect(result).toEqual({ error: "FORBIDDEN" });
  });

  it("returns error when API call throws", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (readApp as jest.Mock).mockRejectedValue(new Error("Network failure"));

    const result = await fetchApps();

    expect(result).toEqual({ error: "Network failure" });
  });

  it("uses default page and size parameters", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (readApp as jest.Mock).mockResolvedValue({ data: { items: [], total: 0 } });

    await fetchApps();

    expect(readApp).toHaveBeenCalledWith({
      query: { page: 1, size: 10 },
      headers: { Authorization: "Bearer test-token" },
    });
  });
});

describe("removeApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes an app and revalidates the dashboard path", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (deleteApp as jest.Mock).mockResolvedValue({});

    await removeApp("app-123");

    expect(deleteApp).toHaveBeenCalledWith({
      headers: { Authorization: "Bearer test-token" },
      path: { app_id: "app-123" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard/apps");
  });

  it("returns error when no access token", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue(undefined);

    const result = await removeApp("app-123");

    expect(deleteApp).not.toHaveBeenCalled();
    expect(result).toEqual({ message: "No access token found" });
  });

  it("returns error message on API failure", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    const mockError = "NOT_FOUND";
    (deleteApp as jest.Mock).mockResolvedValue({ error: mockError });

    const result = await removeApp("app-123");

    expect(result).toEqual({ message: "NOT_FOUND" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("addApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an app and redirects to dashboard on success", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (createApp as jest.Mock).mockResolvedValue({});

    const formData = new FormData();
    formData.set("name", "My App");
    formData.set("description", "My app description");
    formData.set("integration_mode", "simulator");
    formData.set("webhook_url", "");

    await addApp({}, formData);

    expect(createApp).toHaveBeenCalledWith({
      headers: { Authorization: "Bearer test-token" },
      body: {
        name: "My App",
        description: "My app description",
        webhook_url: null,
        config_json: { integration: { mode: "simulator" } },
      },
    });
    expect(redirect).toHaveBeenCalledWith("/dashboard/apps");
  });

  it("creates an app with webhook config", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (createApp as jest.Mock).mockResolvedValue({});

    const formData = new FormData();
    formData.set("name", "Webhook App");
    formData.set("description", "Uses webhooks");
    formData.set("integration_mode", "webhook");
    formData.set("webhook_url", "https://example.com/hook");

    await addApp({}, formData);

    expect(createApp).toHaveBeenCalledWith({
      headers: { Authorization: "Bearer test-token" },
      body: {
        name: "Webhook App",
        description: "Uses webhooks",
        webhook_url: "https://example.com/hook",
        config_json: { integration: { mode: "webhook" } },
      },
    });
  });

  it("returns error when no access token", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue(undefined);

    const formData = new FormData();
    formData.set("name", "My App");
    formData.set("description", "Description");

    const result = await addApp({}, formData);

    expect(createApp).not.toHaveBeenCalled();
    expect(result).toEqual({ message: "No access token found" });
  });

  it("returns validation errors for empty fields", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    const formData = new FormData();
    formData.set("name", "");
    formData.set("description", "");

    const result = await addApp({}, formData);

    expect(result).toEqual({
      errors: {
        name: ["Name is required"],
        description: ["Description is required"],
      },
    });
    expect(createApp).not.toHaveBeenCalled();
  });

  it("returns error message on API failure", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (createApp as jest.Mock).mockResolvedValue({
      error: { detail: "APP_ALREADY_EXISTS" },
    });

    const formData = new FormData();
    formData.set("name", "My App");
    formData.set("description", "Description");

    const result = await addApp({}, formData);

    expect(result).toEqual({ message: "APP_ALREADY_EXISTS" });
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("fetchAppById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns app data on success", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    const mockData = { id: "app-1", name: "My App", description: "Desc" };
    (getApp as jest.Mock).mockResolvedValue({ data: mockData });

    const result = await fetchAppById("app-1");

    expect(getApp).toHaveBeenCalledWith({
      path: { app_id: "app-1" },
      headers: { Authorization: "Bearer test-token" },
    });
    expect(result).toEqual({ data: mockData });
  });

  it("returns error when no access token", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue(undefined);

    const result = await fetchAppById("app-1");

    expect(getApp).not.toHaveBeenCalled();
    expect(result).toEqual({ error: "No access token found" });
  });

  it("returns error message on API failure", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (getApp as jest.Mock).mockResolvedValue({ error: "NOT_FOUND" });

    const result = await fetchAppById("app-1");

    expect(result).toEqual({ error: "NOT_FOUND" });
  });

  it("returns error when API call throws", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (getApp as jest.Mock).mockRejectedValue(new Error("Connection refused"));

    const result = await fetchAppById("app-1");

    expect(result).toEqual({ error: "Connection refused" });
  });
});

describe("editApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("updates an app and redirects to dashboard on success", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (updateApp as jest.Mock).mockResolvedValue({});

    const formData = new FormData();
    formData.set("name", "Updated Name");
    formData.set("description", "Updated Description");
    formData.set("integration_mode", "webhook");
    formData.set("webhook_url", "https://example.com/hook");

    await editApp("app-1", {}, formData);

    expect(updateApp).toHaveBeenCalledWith({
      path: { app_id: "app-1" },
      headers: { Authorization: "Bearer test-token" },
      body: {
        name: "Updated Name",
        description: "Updated Description",
        webhook_url: "https://example.com/hook",
        config_json: { integration: { mode: "webhook" } },
      },
    });
    expect(redirect).toHaveBeenCalledWith("/dashboard/apps");
  });

  it("returns error when no access token", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue(undefined);

    const formData = new FormData();
    formData.set("name", "Name");
    formData.set("description", "Desc");

    const result = await editApp("app-1", {}, formData);

    expect(updateApp).not.toHaveBeenCalled();
    expect(result).toEqual({ message: "No access token found" });
  });

  it("returns validation errors for empty fields", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    const formData = new FormData();
    formData.set("name", "");
    formData.set("description", "");

    const result = await editApp("app-1", {}, formData);

    expect(result).toEqual({
      errors: {
        name: ["Name is required"],
        description: ["Description is required"],
      },
    });
    expect(updateApp).not.toHaveBeenCalled();
  });

  it("returns error message on API failure", async () => {
    const mockCookieStore = await cookies();
    (mockCookieStore.get as jest.Mock).mockReturnValue({
      value: "test-token",
    });

    (updateApp as jest.Mock).mockResolvedValue({
      error: { detail: "APP_NOT_FOUND" },
    });

    const formData = new FormData();
    formData.set("name", "Name");
    formData.set("description", "Desc");

    const result = await editApp("app-1", {}, formData);

    expect(result).toEqual({ message: "APP_NOT_FOUND" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
