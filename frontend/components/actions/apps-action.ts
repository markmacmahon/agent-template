"use server";

import { cookies } from "next/headers";
import {
  readApp,
  deleteApp,
  createApp,
  getApp,
  updateApp,
} from "@/app/clientService";
import { ReadAppResponse, AppRead } from "@/app/clientService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appSchema } from "@/lib/definitions";
import { t, translateError } from "@/i18n/keys";

export async function fetchApps(
  page: number = 1,
  size: number = 10,
): Promise<{ data: ReadAppResponse } | { error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await readApp({
      query: {
        page: page,
        size: size,
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
    return {
      error: err instanceof Error ? err.message : t("ERROR_FETCH_APPS"),
    };
  }
}

export async function removeApp(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: t("ERROR_NO_TOKEN") };
  }

  const { error } = await deleteApp({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    path: {
      app_id: id,
    },
  });

  if (error) {
    return { message: error };
  }
  revalidatePath("/dashboard/apps");
}

export async function addApp(prevState: {}, formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: t("ERROR_NO_TOKEN") };
  }

  const validatedFields = appSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    integration_mode: formData.get("integration_mode") || "simulator",
    webhook_url: formData.get("webhook_url") || "",
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, description, integration_mode, webhook_url } =
    validatedFields.data;

  const webhookSecret = formData.get("webhook_secret") as string | null;

  // Build config_json with simulator settings when applicable
  const config_json: Record<string, unknown> = {
    integration: { mode: integration_mode },
  };

  if (integration_mode === "simulator") {
    config_json.simulator = {
      scenario: (formData.get("simulator_scenario") as string) || "generic",
      disclaimer: formData.get("simulator_disclaimer") === "true",
    };
  }

  const { error } = await createApp({
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: {
      name,
      description,
      webhook_url: webhook_url || null,
      webhook_secret: webhookSecret || null,
      config_json,
    },
  });
  if (error) {
    return { message: `${error.detail}` };
  }
  redirect(`/dashboard/apps`);
}

export async function fetchAppById(
  id: string,
): Promise<{ data: AppRead } | { error: string }> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { error: t("ERROR_NO_TOKEN") };
  }

  try {
    const { data, error } = await getApp({
      path: { app_id: id },
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
      return { error: t("ERROR_APP_NOT_FOUND") };
    }

    return { data };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : t("ERROR_FETCH_APP"),
    };
  }
}

export async function editApp(
  appId: string,
  prevState: {},
  formData: FormData,
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { message: t("ERROR_NO_TOKEN") };
  }

  const validatedFields = appSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    integration_mode: formData.get("integration_mode") || "simulator",
    webhook_url: formData.get("webhook_url") || "",
  });

  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors };
  }

  const { name, description, integration_mode, webhook_url } =
    validatedFields.data;

  const webhookSecret = formData.get("webhook_secret") as string | null;

  // Build config_json with simulator settings when applicable
  const config_json: Record<string, unknown> = {
    integration: { mode: integration_mode },
  };

  if (integration_mode === "simulator") {
    config_json.simulator = {
      scenario: (formData.get("simulator_scenario") as string) || "generic",
      disclaimer: formData.get("simulator_disclaimer") === "true",
    };
  }

  // Only send webhook_secret if it was explicitly changed (not the masked placeholder)
  const body: Record<string, unknown> = {
    name,
    description,
    webhook_url: webhook_url || null,
    config_json,
  };

  if (webhookSecret && webhookSecret !== "••••••") {
    body.webhook_secret = webhookSecret;
  } else if (webhookSecret === "") {
    body.webhook_secret = null;
  }

  const { error } = await updateApp({
    path: { app_id: appId },
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body,
  });

  if (error) {
    return { message: `${error.detail}` };
  }

  redirect(`/dashboard/apps`);
}

export async function testWebhook(
  appId: string,
  webhookUrl: string,
  sampleMessage: string = "Hello",
): Promise<Record<string, unknown>> {
  const cookieStore = await cookies();
  const token = cookieStore.get("accessToken")?.value;

  if (!token) {
    return { ok: false, error: t("ERROR_NO_TOKEN") };
  }

  const baseUrl = process.env.API_BASE_URL;

  try {
    const res = await fetch(`${baseUrl}/apps/${appId}/webhook/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        webhook_url: webhookUrl,
        sample_message: sampleMessage,
      }),
    });
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return { ok: false, error: t("ERROR_NETWORK") };
  }
}
