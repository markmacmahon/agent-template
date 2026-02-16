import { useState, useCallback, useRef } from "react";
import { t } from "@/i18n/keys";
import type { MessageRead } from "@/lib/openapi-client/index";
import { createLogger } from "@/lib/logger";

export type StreamStatus = "idle" | "streaming" | "error";

interface UseChatStreamOptions {
  appId: string;
  threadId: string;
  onMessageComplete?: (message: MessageRead) => void;
  onError?: (error: string) => void;
}

/**
 * Parse SSE event stream from a ReadableStream
 * Handles event: and data: lines
 */
async function* parseSSE(reader: ReadableStreamDefaultReader<Uint8Array>) {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    let eventType = "message";
    let eventData = "";

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        eventData = line.slice(5).trim();
      } else if (line === "" && eventData) {
        // Empty line indicates end of event
        yield { type: eventType, data: eventData };
        eventType = "message";
        eventData = "";
      }
    }
  }
}

interface SSEDeltaEvent {
  text: string;
}

interface SSEDoneEvent {
  status: string;
  message_id?: string;
  seq?: number;
}

interface SSEErrorEvent {
  message: string;
}

export function useChatStream({
  appId,
  threadId,
  onMessageComplete,
  onError,
}: UseChatStreamOptions) {
  const logger = createLogger("useChatStream");
  const [streamingText, setStreamingText] = useState<string>("");
  const [status, setStatus] = useState<StreamStatus>("idle");
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    async (overrideThreadId?: string) => {
      // Use the override if provided, otherwise fall back to the prop
      const actualThreadId = overrideThreadId || threadId;

      // Clean up any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setStreamingText("");
      setStatus("streaming");

      // Get token from cookie (client-side)
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(";").shift();
        return undefined;
      };

      const accessToken = getCookie("accessToken");
      if (!accessToken) {
        setStatus("error");
        if (onError) onError("Unauthorized - please log in");
        return;
      }

      // Call backend directly with Authorization header
      const backendUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const url = `${backendUrl}/apps/${appId}/threads/${actualThreadId}/run/stream`;

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Track accumulated text for the done event
      let accumulatedText = "";

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "text/event-stream",
          },
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const reader = response.body.getReader();

        // Parse SSE events from stream
        for await (const event of parseSSE(reader)) {
          if (abortController.signal.aborted) break;

          if (event.type === "meta") {
            // Meta event received, no action needed
          } else if (event.type === "delta") {
            const data = JSON.parse(event.data) as SSEDeltaEvent;
            accumulatedText += data.text;
            setStreamingText((prev) => prev + data.text);
          } else if (event.type === "done") {
            const data = JSON.parse(event.data) as SSEDoneEvent;

            if (data.status === "completed" && data.message_id) {
              // Message was persisted by backend
              if (onMessageComplete) {
                const completedMessage: MessageRead = {
                  id: data.message_id,
                  thread_id: actualThreadId,
                  seq: data.seq || 0,
                  role: "assistant",
                  content: accumulatedText,
                  content_json: {},
                  created_at: new Date().toISOString(),
                };
                onMessageComplete(completedMessage);
              }
            }

            setStatus("idle");
            setStreamingText("");
            break;
          } else if (event.type === "error") {
            const data = JSON.parse(event.data) as SSEErrorEvent;
            logger.error("SSE error event:", data);

            if (onError) {
              onError(data.message || "Stream error occurred");
            }

            setStatus("error");
            setStreamingText("");
            break;
          }
        }
      } catch (error) {
        if (abortController.signal.aborted) {
          // User stopped the stream, not an error
          setStatus("idle");
          setStreamingText("");
          return;
        }

        logger.error("Stream error:", error);
        setStatus("error");
        setStreamingText("");

        if (onError) {
          const errorMsg =
            error instanceof Error ? error.message : t("ERROR_STREAM_FAILED");
          onError(errorMsg);
        }
      }
    },
    [appId, threadId, onMessageComplete, onError],
  );

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("idle");
    setStreamingText("");
  }, []);

  return {
    streamingText,
    status,
    startStream,
    stopStream,
  };
}
