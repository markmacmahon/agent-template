import {
  fetchSubscribers,
  fetchSubscriberThreads,
} from "@/components/actions/subscribers-actions";
import { listSubscribers, listSubscriberThreads } from "@/app/openapi-client";
import { cookies } from "next/headers";

jest.mock("../../app/openapi-client", () => ({
  listSubscribers: jest.fn(),
  listSubscriberThreads: jest.fn(),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn(),
  }),
}));

describe("subscribers-actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("fetchSubscribers", () => {
    it("returns data on success", async () => {
      const mockCookieStore = await cookies();
      (mockCookieStore.get as jest.Mock).mockReturnValue({
        value: "test-token",
      });

      const mockData = {
        items: [],
        next_cursor: null,
      };
      (listSubscribers as jest.Mock).mockResolvedValue({ data: mockData });

      const result = await fetchSubscribers("app-1", undefined, 25);

      expect(listSubscribers).toHaveBeenCalledWith({
        path: { app_id: "app-1" },
        query: { cursor: undefined, limit: 25 },
        headers: { Authorization: "Bearer test-token" },
      });
      expect(result).toEqual({ data: mockData });
    });

    it("returns error when no access token", async () => {
      const mockCookieStore = await cookies();
      (mockCookieStore.get as jest.Mock).mockReturnValue(undefined);

      const result = await fetchSubscribers("app-1");

      expect(listSubscribers).not.toHaveBeenCalled();
      expect(result).toEqual({ error: "No access token found" });
    });

    it("returns error when API returns error", async () => {
      const mockCookieStore = await cookies();
      (mockCookieStore.get as jest.Mock).mockReturnValue({
        value: "test-token",
      });
      (listSubscribers as jest.Mock).mockResolvedValue({
        error: { detail: "ERROR_FORBIDDEN" },
      });

      const result = await fetchSubscribers("app-1");

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toBeTruthy();
    });
  });

  describe("fetchSubscriberThreads", () => {
    it("returns data on success", async () => {
      const mockCookieStore = await cookies();
      (mockCookieStore.get as jest.Mock).mockReturnValue({
        value: "test-token",
      });

      const mockData = {
        items: [],
        next_cursor: null,
      };
      (listSubscriberThreads as jest.Mock).mockResolvedValue({
        data: mockData,
      });

      const result = await fetchSubscriberThreads(
        "app-1",
        "sub-1",
        undefined,
        25,
      );

      expect(listSubscriberThreads).toHaveBeenCalledWith({
        path: { app_id: "app-1", subscriber_id: "sub-1" },
        query: { cursor: undefined, limit: 25 },
        headers: { Authorization: "Bearer test-token" },
      });
      expect(result).toEqual({ data: mockData });
    });

    it("returns error when no access token", async () => {
      const mockCookieStore = await cookies();
      (mockCookieStore.get as jest.Mock).mockReturnValue(undefined);

      const result = await fetchSubscriberThreads("app-1", "sub-1");

      expect(listSubscriberThreads).not.toHaveBeenCalled();
      expect(result).toEqual({ error: "No access token found" });
    });

    it("returns error when API returns error", async () => {
      const mockCookieStore = await cookies();
      (mockCookieStore.get as jest.Mock).mockReturnValue({
        value: "test-token",
      });
      (listSubscriberThreads as jest.Mock).mockResolvedValue({
        error: { detail: "ERROR_NOT_FOUND" },
      });

      const result = await fetchSubscriberThreads("app-1", "sub-1");

      expect(result).toHaveProperty("error");
      expect((result as { error: string }).error).toBeTruthy();
    });
  });
});
