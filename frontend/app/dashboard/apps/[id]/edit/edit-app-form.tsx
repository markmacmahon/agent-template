"use client";

import { useState, useEffect, useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { editApp, testWebhook } from "@/components/actions/apps-action";
import { SubmitButton } from "@/components/ui/submitButton";
import { usePageTitle } from "@/components/breadcrumb-context";
import { Copy, ChevronDown, ChevronRight } from "lucide-react";

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

interface EditAppFormProps {
  app: {
    id: string;
    name: string;
    description?: string | null;
    webhook_url?: string | null;
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

  const [selectedMode, setSelectedMode] = useState<string>(currentMode);
  const [webhookUrl, setWebhookUrl] = useState(app.webhook_url ?? "");
  const [contractTab, setContractTab] = useState<
    "request" | "response" | "examples"
  >("request");
  const [sseExpanded, setSseExpanded] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
      setTestResult({ ok: false, error: "Network error" });
    } finally {
      setTestLoading(false);
    }
  };

  const webhookUrlWarning =
    selectedMode === "webhook" && !webhookUrl
      ? "No webhook configured. Simulator will be used until you add one."
      : null;

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">Edit App</h1>
        <p className="text-lg text-muted-foreground">
          Update the details of your app below.
        </p>
      </header>

      <form
        action={dispatch}
        className="bg-card rounded-lg shadow-lg p-8 space-y-8"
      >
        {/* --- App details --- */}
        <div className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="name">App Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="App name"
              defaultValue={app.name}
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

        {/* === Integration mode === */}
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
              ? "Use built-in simulated replies for testing."
              : "We will POST each customer message to your webhook and expect a JSON reply."}
          </p>
        </div>

        {/* === Webhook URL (only if webhook) === */}
        {selectedMode === "webhook" && (
          <div className="space-y-4 border-t border-border pt-6">
            <Label htmlFor="webhook_url" className="text-lg font-semibold">
              Webhook URL
            </Label>
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
                  ? "Not configured"
                  : testResult
                    ? testResult.ok
                      ? "Last test: OK"
                      : "Last test: Failed"
                    : "Valid URL"}
              </span>
            </div>
          </div>
        )}

        {/* Hidden webhook_url for simulator mode */}
        {selectedMode !== "webhook" && (
          <input type="hidden" name="webhook_url" value="" />
        )}

        <SubmitButton text="Update App" />

        {state?.message && (
          <div className="mt-2 text-center text-sm text-destructive">
            <p>{state.message}</p>
          </div>
        )}
      </form>

      {/* === Test Webhook (outside form) === */}
      {selectedMode === "webhook" && webhookUrl && (
        <div className="bg-card rounded-lg shadow-lg p-8 mt-6 space-y-4">
          <h2 className="text-lg font-semibold">Test Webhook</h2>
          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="test_message">Sample message</Label>
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
              {testLoading ? "Testing..." : "Test webhook"}
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
                      : "Error"}{" "}
                    &mdash; {testResult.latency_ms as number}ms
                  </p>
                  <p className="text-red-700">{testResult.error as string}</p>
                </div>
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
          <h2 className="text-lg font-semibold">Webhook Contract</h2>

          {/* Tabs */}
          <div className="flex gap-0 rounded-md border border-input overflow-hidden w-fit">
            {(
              [
                ["request", "Request"],
                ["response", "Response"],
                ["examples", "Examples"],
              ] as const
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
        </div>
      )}

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
              Streaming Responses (Optional)
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
