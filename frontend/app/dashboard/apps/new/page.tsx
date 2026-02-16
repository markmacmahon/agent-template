"use client";

import { useState, useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { addApp } from "@/components/actions/apps-action";
import { SubmitButton } from "@/components/ui/submitButton";
import { t } from "@/i18n/keys";

const initialState = { message: "" };

function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function CreateAppPage() {
  const [state, dispatch] = useActionState(addApp, initialState);
  const [selectedMode, setSelectedMode] = useState<string>("simulator");
  const [scenario, setScenario] = useState<string>("generic");
  const [disclaimer, setDisclaimer] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  const webhookUrlWarning =
    selectedMode === "webhook" && !webhookUrl ? t("WEBHOOK_URL_WARNING") : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">
            {t("APP_CREATE_TITLE")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("APP_CREATE_SUBTITLE")}
          </p>
        </header>

        <form
          action={dispatch}
          className="bg-card rounded-lg shadow-lg p-8 space-y-8"
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name">{t("APP_LABEL_NAME")}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder={t("APP_PLACEHOLDER_NAME")}
                required
                className="w-full"
              />
              {state.errors?.name && (
                <p className="text-destructive text-sm">{state.errors.name}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="description">{t("APP_LABEL_DESCRIPTION")}</Label>
              <Input
                id="description"
                name="description"
                type="text"
                placeholder={t("APP_PLACEHOLDER_DESCRIPTION")}
                required
                className="w-full"
              />
              {state.errors?.description && (
                <p className="text-destructive text-sm">
                  {state.errors.description}
                </p>
              )}
            </div>
          </div>

          {/* Integration mode */}
          <div className="space-y-4 border-t border-border pt-6">
            <h2 className="text-lg font-semibold">
              {t("APP_INTEGRATION_HEADING")}
            </h2>

            <div className="flex gap-0 rounded-md border border-input overflow-hidden w-fit">
              {(["simulator", "webhook"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedMode(mode)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    selectedMode === mode
                      ? "bg-foreground text-background"
                      : "bg-background text-foreground hover:bg-muted"
                  }`}
                >
                  {mode === "simulator"
                    ? t("APP_MODE_SIMULATOR")
                    : t("APP_MODE_WEBHOOK")}
                </button>
              ))}
            </div>
            <input type="hidden" name="integration_mode" value={selectedMode} />

            <p className="text-sm text-muted-foreground">
              {selectedMode === "simulator"
                ? t("APP_MODE_SIMULATOR_DESC")
                : t("APP_MODE_WEBHOOK_DESC")}
            </p>
          </div>

          {/* Simulator configuration (only if simulator) */}
          {selectedMode === "simulator" && (
            <div className="space-y-5 border-t border-border pt-6">
              <h2 className="text-lg font-semibold">{t("SIM_HEADING")}</h2>

              {/* Scenario picker */}
              <div className="space-y-2">
                <Label htmlFor="simulator_scenario">
                  {t("SIM_SCENARIO_LABEL")}
                </Label>
                <div className="flex gap-0 rounded-md border border-input overflow-hidden w-fit">
                  {(
                    [
                      ["generic", t("SIM_SCENARIO_GENERIC")],
                      ["ecommerce_support", t("SIM_SCENARIO_ECOMMERCE")],
                    ] as [string, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setScenario(key)}
                      className={`px-4 py-2 text-sm font-medium transition-colors ${
                        scenario === key
                          ? "bg-foreground text-background"
                          : "bg-background text-foreground hover:bg-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <input
                  type="hidden"
                  name="simulator_scenario"
                  value={scenario}
                />
                <p className="text-sm text-muted-foreground">
                  {scenario === "generic"
                    ? t("SIM_SCENARIO_GENERIC_DESC")
                    : t("SIM_SCENARIO_ECOMMERCE_DESC")}
                </p>
              </div>

              {/* Disclaimer toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={disclaimer}
                  onClick={() => setDisclaimer(!disclaimer)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    disclaimer ? "bg-foreground" : "bg-muted"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow ring-0 transition-transform ${
                      disclaimer ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
                <input
                  type="hidden"
                  name="simulator_disclaimer"
                  value={disclaimer ? "true" : "false"}
                />
                <div>
                  <Label className="text-sm font-medium">
                    {t("SIM_DISCLAIMER_LABEL")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("SIM_DISCLAIMER_DESC")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Webhook URL (only if webhook) */}
          {selectedMode === "webhook" && (
            <div className="space-y-4 border-t border-border pt-6">
              <h2 className="text-lg font-semibold">
                {t("WEBHOOK_URL_LABEL")}
              </h2>
              <Input
                id="webhook_url"
                name="webhook_url"
                type="url"
                placeholder={t("WEBHOOK_URL_PLACEHOLDER")}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full"
              />
              {webhookUrlWarning && (
                <p className="text-sm text-amber-600">{webhookUrlWarning}</p>
              )}
              {state.errors?.webhook_url && (
                <p className="text-destructive text-sm">
                  {state.errors.webhook_url}
                </p>
              )}
              <p className="text-muted-foreground text-sm">
                {t("WEBHOOK_URL_CORS_NOTE")}
              </p>

              {/* App ID & Secret (optional) — saved when app is created */}
              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="text-base font-semibold">
                  {t("PARTNER_API_CREDENTIALS_HEADING_OPTIONAL")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("PARTNER_API_CREDENTIALS_INTRO_CREATE")}
                </p>
                <Label htmlFor="webhook_secret">
                  {t("WEBHOOK_SECRET_LABEL")}
                </Label>
                <div className="flex gap-2 flex-wrap items-center">
                  <Input
                    id="webhook_secret"
                    name="webhook_secret"
                    type="password"
                    autoComplete="off"
                    placeholder={t("WEBHOOK_SECRET_PLACEHOLDER")}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="flex-1 min-w-[200px] font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWebhookSecret(generateWebhookSecret())}
                  >
                    {t("WEBHOOK_SECRET_GENERATE")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden webhook fields for simulator mode */}
          {selectedMode !== "webhook" && (
            <>
              <input type="hidden" name="webhook_url" value="" />
              <input type="hidden" name="webhook_secret" value="" />
            </>
          )}

          <SubmitButton
            text={
              selectedMode === "webhook"
                ? t("APP_CREATE_SUBMIT_WEBHOOK")
                : t("APP_CREATE_SUBMIT")
            }
          />

          {state?.message && (
            <div className="mt-2 text-center text-sm text-destructive">
              <p>{state.message}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
