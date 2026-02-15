"use server";

import { cookies } from "next/headers";
import { t, translateError } from "@/i18n/keys";
import {
  listThreads,
  createThread,
  updateThread,
  listMessages,
  createMessage,
  type ThreadRead,
  type MessageRead,
} from "@/app/openapi-client";

type SuccessResult<T> = { data: T };
type ErrorResult = { error: string };
type ActionResult<T> = SuccessResult<T> | ErrorResult;

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("accessToken")?.value || null;
}

export async function fetchThreads(
  appId: string,
  page: number = 1,
  size: number = 50,
): Promise<ActionResult<ThreadRead[]>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await listThreads({
      path: { app_id: appId },
      query: { page, size },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      const detail =
        typeof error === "object" && "detail" in error
          ? String(error.detail)
          : String(error);
      return { error: translateError(detail) };
    }

    if (!data) {
      return { error: t("ERROR_NO_DATA") };
    }

    return { data: data.items || [] };
  } catch (err) {
    return { error: err instanceof Error ? err.message : t("ERROR_UNKNOWN") };
  }
}

export async function createNewThread(
  appId: string,
  customerId: string,
  title: string,
): Promise<ActionResult<ThreadRead>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await createThread({
      path: { app_id: appId },
      body: {
        customer_id: customerId,
        title,
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      const detail =
        typeof error === "object" && "detail" in error
          ? String(error.detail)
          : String(error);
      return { error: translateError(detail) };
    }

    if (!data) {
      return { error: t("ERROR_NO_DATA") };
    }

    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : t("ERROR_UNKNOWN") };
  }
}

export async function updateThreadTitle(
  threadId: string,
  title: string,
): Promise<ActionResult<ThreadRead>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await updateThread({
      path: { thread_id: threadId },
      body: { title: title || null },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      const detail =
        typeof error === "object" && "detail" in error
          ? String(error.detail)
          : String(error);
      return { error: translateError(detail) };
    }

    if (!data) {
      return { error: t("ERROR_NO_DATA") };
    }

    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : t("ERROR_UNKNOWN") };
  }
}

export async function fetchMessages(
  appId: string,
  threadId: string,
  limit: number = 100,
): Promise<ActionResult<MessageRead[]>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await listMessages({
      path: { app_id: appId, thread_id: threadId },
      query: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      const detail =
        typeof error === "object" && "detail" in error
          ? String(error.detail)
          : String(error);
      return { error: translateError(detail) };
    }

    if (!data) {
      return { error: t("ERROR_NO_DATA") };
    }

    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : t("ERROR_UNKNOWN") };
  }
}

export async function sendMessage(
  appId: string,
  threadId: string,
  content: string,
): Promise<ActionResult<MessageRead>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await createMessage({
      path: { app_id: appId, thread_id: threadId },
      body: { content },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (error) {
      const detail =
        typeof error === "object" && "detail" in error
          ? String(error.detail)
          : String(error);
      return { error: translateError(detail) };
    }

    if (!data) {
      return { error: t("ERROR_NO_DATA") };
    }

    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : t("ERROR_UNKNOWN") };
  }
}
