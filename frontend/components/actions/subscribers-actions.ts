"use server";

import { cookies } from "next/headers";
import { t, translateError } from "@/i18n/keys";
import {
  listSubscribers,
  getSubscriber,
  listSubscriberThreads,
  type SubscriberRead,
  type CursorPageSubscriberSummary,
  type CursorPageThreadSummary,
} from "@/app/clientService";

type SuccessResult<T> = { data: T };
type ErrorResult = { error: string };
type ActionResult<T> = SuccessResult<T> | ErrorResult;

async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get("accessToken")?.value || null;
}

export async function fetchSubscribers(
  appId: string,
  cursor?: string,
  limit: number = 25,
  q?: string,
): Promise<ActionResult<CursorPageSubscriberSummary>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await listSubscribers({
      path: { app_id: appId },
      query: { cursor, limit, q },
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
    return {
      error: err instanceof Error ? err.message : t("ERROR_FETCH_SUBSCRIBERS"),
    };
  }
}

export async function fetchSubscriberDetail(
  appId: string,
  subscriberId: string,
): Promise<ActionResult<SubscriberRead>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await getSubscriber({
      path: { app_id: appId, subscriber_id: subscriberId },
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
    return {
      error: err instanceof Error ? err.message : t("ERROR_FETCH_SUBSCRIBERS"),
    };
  }
}

export async function fetchSubscriberThreads(
  appId: string,
  subscriberId: string,
  cursor?: string,
  limit: number = 25,
): Promise<ActionResult<CursorPageThreadSummary>> {
  const token = await getAuthToken();
  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await listSubscriberThreads({
      path: { app_id: appId, subscriber_id: subscriberId },
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
    return {
      error:
        err instanceof Error
          ? err.message
          : t("ERROR_FETCH_SUBSCRIBER_THREADS"),
    };
  }
}
