"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { registerRegister, authJwtLogin } from "@/app/clientService";

import { registerSchema } from "@/lib/definitions";
import { getErrorMessage } from "@/lib/utils";
import { t } from "@/i18n/keys";
import { createLogger } from "@/lib/logger";

const logger = createLogger("registerAction");

export async function register(prevState: unknown, formData: FormData) {
  const rawEmail = (formData.get("email") as string) ?? "";
  const rawPassword = (formData.get("password") as string) ?? "";

  const validatedFields = registerSchema.safeParse({
    email: rawEmail,
    password: rawPassword,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      email: rawEmail,
      password: rawPassword,
    };
  }

  const { email, password } = validatedFields.data;

  const input = {
    body: {
      email,
      password,
    },
  };
  try {
    const { error } = await registerRegister(input);
    if (error) {
      return {
        server_validation_error: getErrorMessage(error),
        email: rawEmail,
        password: rawPassword,
      };
    }
  } catch (err) {
    logger.error("Registration error:", err);
    return {
      server_error: t("ERROR_UNEXPECTED"),
      email: rawEmail,
      password: rawPassword,
    };
  }

  const { data, error: loginError } = await authJwtLogin({
    body: { username: email, password },
  });
  if (loginError || !data?.access_token) {
    return {
      server_error: t("ERROR_UNEXPECTED"),
      email: rawEmail,
      password: rawPassword,
    };
  }
  (await cookies()).set("accessToken", data.access_token);
  redirect("/dashboard");
}
