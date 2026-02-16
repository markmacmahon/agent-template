"use client";

import { useState, useEffect, useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { editApp, testWebhook } from "@/components/actions/apps-action";
import { SubmitButton } from "@/components/ui/submitButton";
import { usePageTitle } from "@/components/breadcrumb-context";
import {
  Copy,
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Eye,
  EyeOff,
  Users,
} from "lucide-react";
import Link from "next/link";
import { t, translateError } from "@/i18n/keys";

const initialState = { message: "" };

// --- Webhook contract data ---

const WEBHOOK_HEADERS = `Content-Type: application/json
X-App-Id: <app_id>
X-Thread-Id: <thread_id>`;

const WEBHOOK_REQUEST_EXAMPLE = `{
  "version": "1.0",
  "event": "message_received",
  "app": {
    "id": "<app_id>",
    "name": "<app_name>"
  },
  "thread": {
    "id": "<thread_id>",
    "customer_id": "<customer_id>"
  },
  "message": {
    "id": "<message_id>",
    "seq": 1,
    "role": "user",
    "content": "Hello, I need help with my order",
    "content_json": {}
  },
  "history_tail": [
    { "role": "user", "content": "Hello", "content_json": {} },
    { "role": "assistant", "content": "Hi! How can I help?", "content_json": {} }
  ],
  "timestamp": "2026-02-15T12:00:00Z"
}`;

const WEBHOOK_RESPONSE_EXAMPLE = `{
  "reply": "Hello! How can I help you today?",
  "metadata": {}
}`;

const EXAMPLE_NODE = `const express = require("express");
const app = express();
app.use(express.json());

app.post("/webhook", (req, res) => {
  const { message } = req.body;
  console.log("Received:", message.content);

  res.json({
    reply: \`You said: \${message.content}\`,
  });
});

app.listen(3001, () => console.log("Webhook on :3001"));
// Tip: use ngrok to expose localhost.`;

const EXAMPLE_PYTHON = `from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.post("/webhook")
async def webhook(request: Request):
    body = await request.json()
    message = body["message"]["content"]
    print(f"Received: {message}")

    return JSONResponse({"reply": f"You said: {message}"})

# uvicorn main:app --port 3001
# Tip: use ngrok to expose localhost.`;

const EXAMPLE_SSE_RESPONSE = `event: delta
data: {"text": "Hello"}

event: delta
data: {"text": ", how can I help?"}

event: done
data: {}`;

const EXAMPLE_SSE_NODE = `app.post("/webhook", (req, res) => {
  const { message } = req.body;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  // Stream tokens as they arrive (e.g. from an LLM)
  const words = \`You said: \${message.content}\`.split(" ");
  words.forEach((word, i) => {
    setTimeout(() => {
      res.write(\`event: delta\\ndata: \${JSON.stringify({ text: word + " " })}\\n\\n\`);
      if (i === words.length - 1) {
        res.write("event: done\\ndata: {}\\n\\n");
        res.end();
      }
    }, i * 100);
  });
});`;

const EXAMPLE_SSE_PYTHON = `from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
import json, asyncio

app = FastAPI()

@app.post("/webhook")
async def webhook(request: Request):
    body = await request.json()
    message = body["message"]["content"]

    async def stream():
        for word in f"You said: {message}".split():
            yield f"event: delta\\ndata: {json.dumps({'text': word + ' '})}\\n\\n"
            await asyncio.sleep(0.1)
        yield "event: done\\ndata: {}\\n\\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

# Tip: use ngrok to expose localhost.`;

const VERIFY_SIG_NODE = `const crypto = require("crypto");

function verifySignature(req, secret) {
  const timestamp = req.headers["x-timestamp"];
  const signature = req.headers["x-signature"];

  const payload = timestamp + "." + JSON.stringify(req.body);

  const expected = "sha256=" +
    crypto.createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`;

const VERIFY_SIG_PYTHON = `import hmac
import hashlib

def verify_signature(secret, timestamp, body, signature):
    payload = f"{timestamp}.{body}"
    expected = "sha256=" + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)`;

const PARTNER_API_HEADERS_APP_SECRET = (appId: string) =>
  `-H "X-App-Id: ${appId}" -H "X-App-Secret: YOUR_WEBHOOK_SECRET"`;

function PartnerApiDoc({
  baseUrl,
  appId,
  hasWebhookSecret,
  copyToClipboard,
}: {
  baseUrl: string;
  appId: string;
  hasWebhookSecret: boolean;
  copyToClipboard: (text: string) => void;
}) {
  const authHeaders = hasWebhookSecret
    ? PARTNER_API_HEADERS_APP_SECRET(appId)
    : `-H "Authorization: Bearer YOUR_ACCESS_TOKEN"`;

  const loginCurl = `curl -X POST ${baseUrl}/auth/jwt/login \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "username=YOUR_EMAIL&password=YOUR_PASSWORD"`;
  const authExampleCurl = `# Every request needs these headers:
curl -X GET "${baseUrl}/apps/${appId}/subscribers?limit=20" \\
  ${PARTNER_API_HEADERS_APP_SECRET(appId)}`;

  const listSubscribersCurl = `curl -X GET "${baseUrl}/apps/${appId}/subscribers?limit=20" \\
  ${authHeaders}`;
  const listThreadsCurl = `curl -X GET "${baseUrl}/apps/${appId}/subscribers/SUBSCRIBER_ID/threads?limit=20" \\
  ${authHeaders}`;
  const postMessageCurl = `curl -X POST ${baseUrl}/apps/${appId}/threads/THREAD_ID/messages/assistant \\
  ${authHeaders} \\
  -H "Content-Type: application/json" \\
  -d '{"content":"Your assistant reply here"}'`;

  return (
    <div className="space-y-6 text-sm">
      <p className="text-muted-foreground">
        {hasWebhookSecret
          ? t("PARTNER_API_INTRO_WITH_SECRET")
          : t("PARTNER_API_INTRO")}
      </p>

      <div className="grid gap-2 rounded-md bg-muted/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">
            {t("PARTNER_API_BASE_URL")}
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(baseUrl)}
            className="text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <code className="block break-all font-mono text-xs text-foreground">
          {baseUrl}
        </code>
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-foreground">
            {hasWebhookSecret
              ? t("PARTNER_API_APP_ID_FOR_SECRET")
              : t("PARTNER_API_APP_ID")}
          </span>
          <button
            type="button"
            onClick={() => copyToClipboard(appId)}
            className="text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <code className="block break-all font-mono text-xs text-foreground">
          {appId}
        </code>
      </div>

      {hasWebhookSecret ? (
        <div>
          <h3 className="font-medium text-foreground">
            {t("PARTNER_API_AUTH_APP_SECRET")}
          </h3>
          <p className="mt-1 text-muted-foreground">
            {t("PARTNER_API_AUTH_APP_SECRET_DESC")}
          </p>
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => copyToClipboard(authExampleCurl)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </button>
            <pre className="rounded-md bg-muted p-3 pr-10 text-xs overflow-x-auto text-foreground whitespace-pre-wrap">
              {authExampleCurl}
            </pre>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-medium text-foreground">
            {t("PARTNER_API_STEP_1")}
          </h3>
          <p className="mt-1 text-muted-foreground">
            {t("PARTNER_API_STEP_1_DESC")}
          </p>
          <div className="relative mt-2">
            <button
              type="button"
              onClick={() => copyToClipboard(loginCurl)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </button>
            <pre className="rounded-md bg-muted p-3 pr-10 text-xs overflow-x-auto text-foreground">
              {loginCurl}
            </pre>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-medium text-foreground">
          {hasWebhookSecret ? "2. " : ""}
          {t("PARTNER_API_STEP_2")}
        </h3>
        <p className="mt-1 text-muted-foreground">
          {t("PARTNER_API_STEP_2_DESC")}
        </p>
        <div className="relative mt-2">
          <button
            type="button"
            onClick={() => copyToClipboard(listSubscribersCurl)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
          <pre className="rounded-md bg-muted p-3 pr-10 text-xs overflow-x-auto text-foreground">
            {listSubscribersCurl}
          </pre>
        </div>
      </div>

      <div>
        <h3 className="font-medium text-foreground">
          {hasWebhookSecret ? "3. " : ""}
          {t("PARTNER_API_STEP_3")}
        </h3>
        <p className="mt-1 text-muted-foreground">
          {t("PARTNER_API_STEP_3_DESC")}
        </p>
        <div className="relative mt-2">
          <button
            type="button"
            onClick={() => copyToClipboard(listThreadsCurl)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
          <pre className="rounded-md bg-muted p-3 pr-10 text-xs overflow-x-auto text-foreground">
            {listThreadsCurl}
          </pre>
        </div>
      </div>

      <div>
        <h3 className="font-medium text-foreground">
          {hasWebhookSecret ? "4. " : ""}
          {t("PARTNER_API_STEP_4")}
        </h3>
        <p className="mt-1 text-muted-foreground">
          {t("PARTNER_API_STEP_4_DESC")}
        </p>
        <div className="relative mt-2">
          <button
            type="button"
            onClick={() => copyToClipboard(postMessageCurl)}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            title="Copy"
          >
            <Copy className="h-4 w-4" />
          </button>
          <pre className="rounded-md bg-muted p-3 pr-10 text-xs overflow-x-auto text-foreground">
            {postMessageCurl}
          </pre>
        </div>
      </div>
    </div>
  );
}

interface EditAppFormProps {
  app: {
    id: string;
    name: string;
    description?: string | null;
    webhook_url?: string | null;
    webhook_secret?: string | null;
    config_json?: Record<string, unknown>;
  };
}

export function EditAppForm({ app }: EditAppFormProps) {
  const { setPageTitle } = usePageTitle();
  const editAppWithId = editApp.bind(null, app.id);
  const [state, dispatch] = useActionState(editAppWithId, initialState);

  useEffect(() => {
    setPageTitle(app.name);
  }, [app.name, setPageTitle]);

  const currentMode =
    (app.config_json?.integration as Record<string, string> | undefined)
      ?.mode ?? "simulator";

  const simulatorCfg =
    (app.config_json?.simulator as Record<string, unknown> | undefined) ?? {};

  const [selectedMode, setSelectedMode] = useState<string>(currentMode);
  const [scenario, setScenario] = useState<string>(
    (simulatorCfg.scenario as string) ?? "generic",
  );
  const [disclaimer, setDisclaimer] = useState<boolean>(
    (simulatorCfg.disclaimer as boolean) ?? false,
  );
  const [webhookUrl, setWebhookUrl] = useState(app.webhook_url ?? "");
  const [webhookSecret, setWebhookSecret] = useState(app.webhook_secret ?? "");
  const [secretRevealed, setSecretRevealed] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [contractTab, setContractTab] = useState<
    "request" | "response" | "examples" | "signing"
  >("request");

  const apiBaseUrl =
    (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_BASE_URL) ||
    "http://localhost:8000";
  const base = apiBaseUrl.replace(/\/$/, "");
  const [sseExpanded, setSseExpanded] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const isSecretMasked = webhookSecret === "••••••";
  const canCopySecret = webhookSecret && !isSecretMasked;
  const canRevealSecret = canCopySecret;

  const handleCopySecret = () => {
    if (!canCopySecret) return;
    navigator.clipboard.writeText(webhookSecret);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const generateSecret = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    setWebhookSecret(hex);
  };

  // --- Test webhook state ---
  const [testMessage, setTestMessage] = useState("Hello");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(
    null,
  );

  const handleTestWebhook = async () => {
    if (!webhookUrl) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const data = await testWebhook(app.id, webhookUrl, testMessage);
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, error: t("ERROR_NETWORK") });
    } finally {
      setTestLoading(false);
    }
  };

  const webhookUrlWarning =
    selectedMode === "webhook" && !webhookUrl ? t("WEBHOOK_URL_WARNING") : null;

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">
          {t("APP_EDIT_TITLE")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("APP_EDIT_SUBTITLE")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/dashboard/apps/${app.id}/chat`}>
            <Button type="button" variant="default" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("SIM_TRY_CHAT")}
            </Button>
          </Link>
          <Link
            href={`/dashboard/apps/${app.id}/subscribers`}
            data-testid="edit-app-subscribers-link"
          >
            <Button type="button" variant="default" className="gap-2">
              <Users className="h-4 w-4" />
              {t("SUBSCRIBERS_NAV_LINK")}
            </Button>
          </Link>
        </div>
      </header>

      <form
        action={dispatch}
        className="bg-card rounded-lg shadow-lg p-8 space-y-8"
      >
        {/* --- App details --- */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name">{t("APP_LABEL_NAME")}</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={t("APP_PLACEHOLDER_NAME")}
              defaultValue={app.name}
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
              defaultValue={app.description ?? ""}
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

        {/* === Integration: Simulator type OR Webhook === */}
        <div className="space-y-4 border-t border-border pt-6">
          <h2 className="text-lg font-semibold">
            {t("APP_INTEGRATION_HEADING")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("APP_INTEGRATION_DESC")}
          </p>
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
        </div>

        {/* === Simulator type (only if Simulator) === */}
        {selectedMode === "simulator" && (
          <div className="space-y-4 border-t border-border pt-6">
            <h2 className="text-lg font-semibold">{t("SIM_HEADING")}</h2>
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
              <input type="hidden" name="simulator_scenario" value={scenario} />
              <p className="text-sm text-muted-foreground">
                {scenario === "generic"
                  ? t("SIM_SCENARIO_GENERIC_DESC")
                  : t("SIM_SCENARIO_ECOMMERCE_DESC")}
              </p>
            </div>
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

        {/* === Webhook URL (only if webhook) === */}
        {selectedMode === "webhook" && (
          <div className="space-y-4 border-t border-border pt-6">
            <Label htmlFor="webhook_url" className="text-lg font-semibold">
              {t("WEBHOOK_URL_LABEL")}
            </Label>
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

            {/* Status pill */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  !webhookUrl
                    ? "bg-muted text-muted-foreground"
                    : testResult
                      ? testResult.ok
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {!webhookUrl
                  ? t("WEBHOOK_STATUS_NOT_CONFIGURED")
                  : testResult
                    ? testResult.ok
                      ? t("WEBHOOK_STATUS_OK")
                      : t("WEBHOOK_STATUS_FAILED")
                    : t("WEBHOOK_STATUS_VALID")}
              </span>
            </div>
          </div>
        )}

        {/* === App ID & Secret (only if webhook) === */}
        {selectedMode === "webhook" && (
          <div className="space-y-4 border-t border-border pt-6">
            <h2 className="text-lg font-semibold">
              {t("PARTNER_API_CREDENTIALS_HEADING")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("PARTNER_API_CREDENTIALS_INTRO")}
            </p>
            <div className="space-y-2">
              <Label>{t("PARTNER_API_APP_ID_FOR_SECRET")}</Label>
              <div className="flex gap-2 flex-wrap items-center">
                <code className="rounded-md bg-muted px-2 py-1.5 font-mono text-sm text-foreground">
                  {app.id}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(app.id)}
                  title="Copy"
                  aria-label="Copy App ID"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook_secret">
                {t("WEBHOOK_SECRET_LABEL")}
              </Label>
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-[200px]">
                  <Input
                    id="webhook_secret"
                    name="webhook_secret"
                    type={
                      canRevealSecret && secretRevealed ? "text" : "password"
                    }
                    placeholder={t("WEBHOOK_SECRET_PLACEHOLDER")}
                    value={webhookSecret}
                    onChange={(e) => setWebhookSecret(e.target.value)}
                    className="w-full font-mono pr-10"
                    readOnly={isSecretMasked}
                  />
                  {canRevealSecret && (
                    <button
                      type="button"
                      onClick={() => setSecretRevealed(!secretRevealed)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={
                        secretRevealed
                          ? t("WEBHOOK_SECRET_HIDE")
                          : t("WEBHOOK_SECRET_SHOW")
                      }
                    >
                      {secretRevealed ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                  disabled={!canCopySecret}
                  title={t("WEBHOOK_SECRET_COPY")}
                  aria-label={t("WEBHOOK_SECRET_COPY")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {copyFeedback && (
                  <span className="text-sm text-muted-foreground">
                    {t("WEBHOOK_SECRET_COPIED")}
                  </span>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateSecret}
                >
                  {t("WEBHOOK_SECRET_GENERATE")}
                </Button>
                {webhookSecret && !isSecretMasked && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setWebhookSecret("")}
                  >
                    {t("WEBHOOK_SECRET_CLEAR")}
                  </Button>
                )}
              </div>
            </div>
            {webhookSecret && !isSecretMasked && (
              <p className="text-xs text-muted-foreground">
                {t("WEBHOOK_SECRET_COPY_WARNING")}
              </p>
            )}
          </div>
        )}

        {/* Hidden fields for simulator mode */}
        {selectedMode !== "webhook" && (
          <>
            <input type="hidden" name="webhook_url" value="" />
            <input type="hidden" name="webhook_secret" value="" />
          </>
        )}

        <SubmitButton
          text={
            selectedMode === "webhook"
              ? t("APP_EDIT_SUBMIT_WEBHOOK")
              : t("APP_EDIT_SUBMIT")
          }
        />

        {state?.message && (
          <div className="mt-2 text-center text-sm text-destructive">
            <p>{state.message}</p>
          </div>
        )}
      </form>

      {/* === Test Webhook (outside form) === */}
      {selectedMode === "webhook" && webhookUrl && (
        <div className="bg-card rounded-lg shadow-lg p-8 mt-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("WEBHOOK_TEST_HEADING")}</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="test_message">
                {t("WEBHOOK_TEST_SAMPLE_LABEL")}
              </Label>
              <Input
                id="test_message"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Hello"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestWebhook}
              disabled={testLoading}
            >
              {testLoading
                ? t("WEBHOOK_TEST_LOADING")
                : t("WEBHOOK_TEST_BUTTON")}
            </Button>
          </div>

          {testResult && (
            <div
              className={`rounded-md border p-4 text-sm ${
                testResult.ok
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              {testResult.ok ? (
                <div className="space-y-1">
                  <p className="font-medium text-green-800">
                    {testResult.status_code as number} OK &mdash;{" "}
                    {testResult.latency_ms as number}ms
                  </p>
                  <p className="text-green-700">
                    Reply:{" "}
                    {(testResult.response_json as Record<string, string>)
                      ?.reply ?? "—"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium text-red-800">
                    {testResult.status_code
                      ? `HTTP ${testResult.status_code}`
                      : t("ERROR_GENERIC")}{" "}
                    &mdash; {testResult.latency_ms as number}ms
                  </p>
                  <p className="text-red-700">
                    {translateError(testResult.error as string)}
                  </p>
                </div>
              )}
              {testResult.signature_sent !== undefined && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Signature:{" "}
                  {testResult.signature_sent
                    ? t("WEBHOOK_TEST_SIGNATURE_SENT")
                    : t("WEBHOOK_TEST_SIGNATURE_NONE")}
                </p>
              )}
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Raw response
                </summary>
                <pre className="mt-2 text-xs overflow-x-auto whitespace-pre-wrap">
                  {String(
                    testResult.response_text ??
                      JSON.stringify(testResult.response_json, null, 2) ??
                      "—",
                  )}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}

      {/* === Webhook Contract === */}
      {selectedMode === "webhook" && (
        <div className="bg-card rounded-lg shadow-lg p-8 mt-6 space-y-4">
          <h2 className="text-lg font-semibold">
            {t("WEBHOOK_CONTRACT_HEADING")}
          </h2>

          {/* Tabs */}
          <div className="flex gap-0 rounded-md border border-input overflow-hidden w-fit">
            {(
              [
                ["request", t("WEBHOOK_TAB_REQUEST")],
                ["response", t("WEBHOOK_TAB_RESPONSE")],
                ["examples", t("WEBHOOK_TAB_EXAMPLES")],
                ["signing", t("WEBHOOK_TAB_SIGNING")],
              ] as ["request" | "response" | "examples" | "signing", string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setContractTab(key)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  contractTab === key
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {contractTab === "request" && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Headers</h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(WEBHOOK_HEADERS)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto">
                  {WEBHOOK_HEADERS}
                </pre>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Request body</h3>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(WEBHOOK_REQUEST_EXAMPLE)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto">
                  {WEBHOOK_REQUEST_EXAMPLE}
                </pre>
              </div>
            </div>
          )}

          {contractTab === "response" && (
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">
                  Required response (200 OK)
                </h3>
                <button
                  type="button"
                  onClick={() => copyToClipboard(WEBHOOK_RESPONSE_EXAMPLE)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto">
                {WEBHOOK_RESPONSE_EXAMPLE}
              </pre>
              <p className="mt-2 text-xs text-muted-foreground">
                Non-2xx, invalid JSON, or missing{" "}
                <code className="font-mono">reply</code> field = webhook
                failure. Timeout: 8 seconds.
              </p>
            </div>
          )}

          {contractTab === "examples" && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Node.js (Express)</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(EXAMPLE_NODE)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto">
                    {EXAMPLE_NODE}
                  </pre>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium">Python (FastAPI)</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(EXAMPLE_PYTHON)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto">
                    {EXAMPLE_PYTHON}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {contractTab === "signing" && (
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                When a webhook secret is configured, each request is signed
                using HMAC-SHA256.
              </p>

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Signature headers
                </h3>
                <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto text-foreground">
                  {`X-Timestamp: 1707960000
X-Signature: sha256=...`}
                </pre>
              </div>

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  How signing works
                </h3>
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  <li>
                    Build the signed payload:{" "}
                    <code className="font-mono text-xs text-foreground">
                      {`"<timestamp>.<raw_body>"`}
                    </code>
                  </li>
                  <li>
                    Compute{" "}
                    <code className="font-mono text-xs text-foreground">
                      HMAC-SHA256(secret, signed_payload)
                    </code>
                  </li>
                  <li>
                    Compare{" "}
                    <code className="font-mono text-xs text-foreground">
                      X-Signature
                    </code>{" "}
                    header value using constant-time comparison
                  </li>
                </ol>
              </div>

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Node.js verification
                </h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(VERIFY_SIG_NODE)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto text-foreground">
                    {VERIFY_SIG_NODE}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Python verification
                </h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(VERIFY_SIG_PYTHON)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto text-foreground">
                    {VERIFY_SIG_PYTHON}
                  </pre>
                </div>
              </div>

              <p className="text-xs border-l-2 border-amber-500 pl-3">
                <strong className="text-foreground">Replay protection:</strong>{" "}
                Reject requests if the timestamp is older than 5 minutes.
              </p>
            </div>
          )}
        </div>
      )}

      {/* === Partner API (always visible: list subscribers, post to thread) === */}
      <div className="bg-card rounded-lg shadow-lg p-8 mt-6">
        <h2 className="text-lg font-semibold">
          {t("WEBHOOK_TAB_PARTNER_API")}
        </h2>
        <PartnerApiDoc
          baseUrl={base}
          appId={app.id}
          hasWebhookSecret={!!app.webhook_secret}
          copyToClipboard={copyToClipboard}
        />
      </div>

      {/* === Streaming Responses (Collapsible, only if webhook) === */}
      {selectedMode === "webhook" && (
        <div className="bg-card rounded-lg shadow-lg p-8 mt-6">
          <button
            type="button"
            onClick={() => setSseExpanded(!sseExpanded)}
            className="flex items-center gap-2 w-full text-left"
          >
            {sseExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <h2 className="text-lg font-semibold">
              {t("WEBHOOK_STREAMING_HEADING")}
            </h2>
          </button>

          {sseExpanded && (
            <div className="mt-4 space-y-4 text-sm text-muted-foreground">
              <p>
                Your webhook can optionally return a{" "}
                <code className="font-mono text-xs text-foreground">
                  text/event-stream
                </code>{" "}
                response instead of JSON. This enables real-time token streaming
                to end users — useful when your backend calls an LLM and wants
                to stream tokens as they are generated.
              </p>

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Standard response (JSON)
                </h3>
                <p className="mt-1">
                  Return{" "}
                  <code className="font-mono text-xs text-foreground">
                    Content-Type: application/json
                  </code>{" "}
                  with{" "}
                  <code className="font-mono text-xs text-foreground">
                    {`{ "reply": "..." }`}
                  </code>
                  . This is the default and simplest approach.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Streaming response (SSE)
                </h3>
                <p className="mt-1">
                  Return{" "}
                  <code className="font-mono text-xs text-foreground">
                    Content-Type: text/event-stream
                  </code>{" "}
                  and emit events as your response is generated. We will proxy
                  the stream directly to the end user.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Event format
                </h3>
                <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto text-foreground">
                  {EXAMPLE_SSE_RESPONSE}
                </pre>
                <ul className="mt-2 list-disc list-inside space-y-1">
                  <li>
                    <code className="font-mono text-xs">delta</code> — a text
                    chunk (streamed to the user)
                  </li>
                  <li>
                    <code className="font-mono text-xs">done</code> — signals
                    end of stream
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Node.js (Express) — streaming
                </h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(EXAMPLE_SSE_NODE)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto text-foreground">
                    {EXAMPLE_SSE_NODE}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-foreground">
                  Python (FastAPI) — streaming
                </h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(EXAMPLE_SSE_PYTHON)}
                    className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto text-foreground">
                    {EXAMPLE_SSE_PYTHON}
                  </pre>
                </div>
              </div>

              <p className="text-xs">
                Streaming is optional. The standard JSON response works for all
                integrations.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
