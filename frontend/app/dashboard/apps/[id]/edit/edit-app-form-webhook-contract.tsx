"use client";

import { Copy } from "lucide-react";
import { t } from "@/i18n/keys";

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

export type WebhookContractTab =
  | "request"
  | "response"
  | "examples"
  | "signing";

export function EditAppFormWebhookContract({
  copyToClipboard,
  contractTab,
  setContractTab,
}: {
  copyToClipboard: (text: string) => void;
  contractTab: WebhookContractTab;
  setContractTab: (tab: WebhookContractTab) => void;
}) {
  return (
    <div className="bg-card rounded-lg shadow-lg p-8 mt-6 space-y-4">
      <h2 className="text-lg font-semibold">{t("WEBHOOK_CONTRACT_HEADING")}</h2>

      <div className="flex gap-0 rounded-md border border-input overflow-hidden w-fit">
        {(
          [
            ["request", t("WEBHOOK_TAB_REQUEST")],
            ["response", t("WEBHOOK_TAB_RESPONSE")],
            ["examples", t("WEBHOOK_TAB_EXAMPLES")],
            ["signing", t("WEBHOOK_TAB_SIGNING")],
          ] as [WebhookContractTab, string][]
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
            <h3 className="text-sm font-medium">Required response (200 OK)</h3>
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
            <code className="font-mono">reply</code> field = webhook failure.
            Timeout: 8 seconds.
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
            When a webhook secret is configured, each request is signed using
            HMAC-SHA256.
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
  );
}
