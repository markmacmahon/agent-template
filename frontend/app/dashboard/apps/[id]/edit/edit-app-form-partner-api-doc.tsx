"use client";

import { Copy } from "lucide-react";
import { t } from "@/i18n/keys";

const PARTNER_API_HEADERS_APP_SECRET = (appId: string) =>
  `-H "X-App-Id: ${appId}" -H "X-App-Secret: YOUR_WEBHOOK_SECRET"`;

export function PartnerApiDoc({
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
