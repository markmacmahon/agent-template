"use client";

import { useState, useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addApp } from "@/components/actions/apps-action";
import { SubmitButton } from "@/components/ui/submitButton";

const initialState = { message: "" };

export default function CreateAppPage() {
  const [state, dispatch] = useActionState(addApp, initialState);
  const [selectedMode, setSelectedMode] = useState<string>("simulator");
  const [webhookUrl, setWebhookUrl] = useState("");

  const webhookUrlWarning =
    selectedMode === "webhook" && !webhookUrl
      ? "No webhook configured. Simulator will be used until you add one."
      : null;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">
            Create New App
          </h1>
          <p className="text-lg text-muted-foreground">
            Enter the details of the new app below.
          </p>
        </header>

        <form
          action={dispatch}
          className="bg-card rounded-lg shadow-lg p-8 space-y-8"
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name">App Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="App name"
                required
                className="w-full"
              />
              {state.errors?.name && (
                <p className="text-destructive text-sm">{state.errors.name}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="description">App Description</Label>
              <Input
                id="description"
                name="description"
                type="text"
                placeholder="Description of the app"
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
            <h2 className="text-lg font-semibold">Integration</h2>

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
                  {mode === "simulator" ? "Simulator" : "Webhook"}
                </button>
              ))}
            </div>
            <input type="hidden" name="integration_mode" value={selectedMode} />

            <p className="text-sm text-muted-foreground">
              {selectedMode === "simulator"
                ? "Use built-in simulated replies for dashboard testing."
                : "We will POST each customer message to your webhook and expect a JSON reply."}
            </p>
          </div>

          {/* Webhook URL (only if webhook) */}
          {selectedMode === "webhook" && (
            <div className="space-y-4 border-t border-border pt-6">
              <h2 className="text-lg font-semibold">Webhook URL</h2>
              <Input
                id="webhook_url"
                name="webhook_url"
                type="url"
                placeholder="https://your-service.com/webhook"
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
            </div>
          )}

          {/* Hidden webhook_url for simulator mode */}
          {selectedMode !== "webhook" && (
            <input type="hidden" name="webhook_url" value="" />
          )}

          <SubmitButton text="Create App" />

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
