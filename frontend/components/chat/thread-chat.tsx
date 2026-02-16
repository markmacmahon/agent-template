"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import type { MessageRead } from "@/lib/openapi-client/index";
import {
  fetchMessages,
  createAssistantMessage,
} from "@/components/actions/chat-actions";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/keys";
import type { ScenarioStep } from "@/lib/scenarios";
import { createLogger } from "@/lib/logger";

interface ThreadChatProps {
  appId: string;
  threadId: string;
}

export interface ThreadChatHandle {
  refreshMessages: () => void;
  streamScenarioMessage: (
    step: ScenarioStep & { role: "assistant" },
  ) => Promise<void>;
}

type PendingMessage = {
  tempId: string;
  content: string;
  status: "pending" | "error";
  error?: string;
};

const logger = createLogger("ThreadChat");

export const ThreadChat = forwardRef<ThreadChatHandle, ThreadChatProps>(
  function ThreadChat({ appId, threadId }: ThreadChatProps, ref) {
    const [messages, setMessages] = useState<MessageRead[]>([]);
    const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>(
      [],
    );
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [reloadToken, setReloadToken] = useState(0);
    const isMountedRef = useRef(true);

    useEffect(() => {
      return () => {
        isMountedRef.current = false;
      };
    }, []);

    // Fetch messages when thread changes
    useEffect(() => {
      async function loadMessages() {
        setLoading(true);
        setLoadError(null);
        setPendingMessages([]);
        const result = await fetchMessages(appId, threadId, 100);
        if ("error" in result) {
          logger.error("Failed to fetch messages:", result.error);
          setLoadError(result.error);
          setMessages([]);
          setLoading(false);
          return;
        }

        setMessages(result.data);
        setLoading(false);
      }

      loadMessages();
    }, [appId, threadId, reloadToken]);

    const sendMessageOptimistic = useCallback(
      async (content: string, reuseId?: string) => {
        if (!content.trim()) {
          return;
        }
        const tempId = reuseId ?? `pending-${Date.now()}-${Math.random()}`;

        if (!reuseId) {
          setPendingMessages((prev) => [
            ...prev,
            { tempId, content, status: "pending" },
          ]);
        }

        setSending(true);
        const result = await createAssistantMessage(appId, threadId, content);
        setSending(false);

        if ("error" in result) {
          logger.error("Failed to send message:", result.error);
          setPendingMessages((prev) =>
            prev.map((msg) =>
              msg.tempId === tempId
                ? { ...msg, status: "error", error: result.error }
                : msg,
            ),
          );
          return;
        }

        setPendingMessages((prev) =>
          prev.filter((msg) => msg.tempId !== tempId),
        );
        setMessages((prev) => [...prev, result.data]);
      },
      [appId, threadId],
    );

    const handleSendMessage = useCallback(
      async (content: string) => {
        await sendMessageOptimistic(content);
      },
      [sendMessageOptimistic],
    );

    const handleRetry = useCallback(
      async (tempId: string) => {
        const pending = pendingMessages.find((msg) => msg.tempId === tempId);
        if (!pending) {
          return;
        }
        setPendingMessages((prev) =>
          prev.map((msg) =>
            msg.tempId === tempId
              ? { ...msg, status: "pending", error: undefined }
              : msg,
          ),
        );
        await sendMessageOptimistic(pending.content, tempId);
      },
      [pendingMessages, sendMessageOptimistic],
    );

    const combinedMessages = useMemo(() => {
      return [
        ...messages,
        ...pendingMessages.map((pending) => ({
          id: pending.tempId,
          thread_id: threadId,
          seq: Number.MAX_SAFE_INTEGER,
          role: "assistant" as const,
          content: pending.content,
          content_json: {},
          created_at: new Date().toISOString(),
          pending: pending.status === "pending",
          error: pending.error,
        })),
      ];
    }, [messages, pendingMessages, threadId]);

    const refreshMessages = useCallback(() => {
      setReloadToken((token) => token + 1);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        refreshMessages,
        streamScenarioMessage: async (step) => {
          const pendingId = `scenario-${Date.now()}-${Math.random()}`;
          const chunkSize = step.chunkSize ?? 30;
          const delayMs = step.chunkDelayMs ?? 220;
          const chunks: string[] = [];
          for (let i = 0; i < step.content.length; i += chunkSize) {
            chunks.push(step.content.slice(i, i + chunkSize));
          }

          let aggregated = "";
          setPendingMessages((prev) => [
            ...prev,
            { tempId: pendingId, content: "", status: "pending" },
          ]);

          for (const chunk of chunks) {
            aggregated += chunk;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            if (!isMountedRef.current) {
              return;
            }
            setPendingMessages((prev) =>
              prev.map((msg) =>
                msg.tempId === pendingId
                  ? { ...msg, content: aggregated }
                  : msg,
              ),
            );
          }

          const result = await createAssistantMessage(
            appId,
            threadId,
            step.content,
          );

          if (!isMountedRef.current) {
            return;
          }

          if ("error" in result) {
            logger.error("Scenario send failed:", result.error);
            setPendingMessages((prev) =>
              prev.map((msg) =>
                msg.tempId === pendingId
                  ? { ...msg, status: "error", error: result.error }
                  : msg,
              ),
            );
            return;
          }

          setPendingMessages((prev) =>
            prev.filter((msg) => msg.tempId !== pendingId),
          );
          setReloadToken((token) => token + 1);
        },
      }),
      [appId, threadId],
    );

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto">
          {loadError ? (
            <div
              className="flex h-full flex-col items-center justify-center gap-2 text-sm text-red-500"
              data-testid="thread-chat-error"
            >
              <p>{loadError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReloadToken((token) => token + 1)}
              >
                {t("ERROR_TRY_AGAIN")}
              </Button>
            </div>
          ) : (
            <MessageList
              messages={combinedMessages}
              messagesLoading={loading}
              onRetryPending={handleRetry}
            />
          )}
        </div>
        <div className="border-t p-4">
          <MessageInput
            onSendMessage={handleSendMessage}
            disabled={loading || sending}
          />
        </div>
      </div>
    );
  },
);
