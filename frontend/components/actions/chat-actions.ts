"use server";

import { cookies } from "next/headers";
import { t, translateError } from "@/i18n/keys";
import {
  listThreads,
  createThread,
  updateThread,
  listMessages,
  createMessage,
  createAssistantMessage as createAssistantMessageAPI,
  usersCurrentUser,
  type ThreadRead,
  type MessageRead,
  type ThreadCreateResponse,
  type CursorPageThreadRead,
} from "@/app/clientService";

type SuccessResult<T> = { data: T };
type ErrorResult = { error: string };
type ActionResult<T> = SuccessResult<T> | ErrorResult;

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("accessToken")?.value || null;
}

export async function fetchThreads(
  appId: string,
  cursor?: string,
  limit: number = 25,
): Promise<ActionResult<CursorPageThreadRead>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await listThreads({
      path: { app_id: appId },
      query: { cursor, limit },
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

export async function createNewThread(
  appId: string,
  customerId: string,
  title: string,
): Promise<ActionResult<ThreadCreateResponse>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await createThread({
      path: { app_id: appId },
      body: {
        customer_id: customerId,
        title: title || undefined,
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

export async function createAssistantMessage(
  appId: string,
  threadId: string,
  content: string,
): Promise<ActionResult<MessageRead>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await createAssistantMessageAPI({
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

export async function fetchCurrentUserId(): Promise<ActionResult<string>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await usersCurrentUser({
      headers: { Authorization: `Bearer ${token}` },
    });

    if (error || !data) {
      return { error: t("ERROR_NO_DATA") };
    }

    return { data: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : t("ERROR_UNKNOWN") };
  }
}
