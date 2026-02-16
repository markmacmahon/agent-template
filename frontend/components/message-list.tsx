"use client";

import type { MessageRead } from "@/app/openapi-client/index";
import { cn } from "@/lib/utils";
import { useScroll } from "@/hooks/use-scroll";
import { ArrowDownIcon, SparklesIcon } from "lucide-react";
import { t } from "@/i18n/keys";

type DisplayMessage = MessageRead & { pending?: boolean; error?: string };

interface MessageListProps {
  messages: DisplayMessage[];
  streamingText?: string;
  /** When true, we're loading messages for the selected thread — don't show the greeting placeholder. */
  messagesLoading?: boolean;
  onRetryPending?: (messageId: string) => void;
}

export function MessageList({
  messages,
  streamingText,
  messagesLoading = false,
  onRetryPending,
}: MessageListProps) {
  const { containerRef, endRef, isAtBottom, scrollToBottom } = useScroll();

  const hasMessages = messages.length > 0 || !!streamingText;
  const showGreeting = !hasMessages && !messagesLoading;

  return (
    <div className="relative flex-1">
      <div
        ref={containerRef}
        className="absolute inset-0 touch-pan-y overflow-y-auto"
      >
        <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
          {/* Greeting / empty state — only when we have no messages and we're not loading */}
          {showGreeting && (
            <div
              data-testid="chat-greeting"
              className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
            >
              <p className="text-xl font-semibold md:text-2xl">
                {t("CHAT_GREETING_TITLE")}
              </p>
              <p className="text-xl text-muted-foreground md:text-2xl">
                {t("CHAT_GREETING_SUBTITLE")}
              </p>
            </div>
          )}

          {/* Loading messages for selected thread */}
          {messagesLoading && !hasMessages && (
            <div
              data-testid="chat-messages-loading"
              className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
            >
              <p className="text-lg text-muted-foreground">
                {t("CHAT_LOADING_MESSAGES")}
              </p>
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              data-testid={`message-${message.role}`}
              data-role={message.role}
              className="group/message w-full animate-in fade-in duration-200"
            >
              <div
                className={cn(
                  "flex w-full items-start gap-2 md:gap-3",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {/* Assistant avatar */}
                {message.role === "assistant" && (
                  <div className="-mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
                    <SparklesIcon className="size-3.5" />
                  </div>
                )}

                <div
                  className={cn(
                    "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    message.role === "user"
                      ? "max-w-[calc(100%-2.5rem)] bg-foreground text-background sm:max-w-[min(fit-content,80%)]"
                      : "w-full bg-transparent px-0 py-0 text-foreground",
                  )}
                >
                  {message.content}
                </div>
              </div>

              {message.pending && (
                <div className="pl-10 text-xs text-muted-foreground flex items-center gap-2">
                  <span>{t("CHAT_SENDING")}</span>
                  <span className="inline-block size-2 animate-pulse rounded-full bg-muted-foreground" />
                </div>
              )}

              {message.error && onRetryPending && (
                <div className="pl-10 text-xs text-destructive flex items-center gap-2">
                  <span>{message.error}</span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => onRetryPending(message.id)}
                  >
                    {t("CHAT_RETRY_SEND")}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Streaming message */}
          {streamingText && (
            <div
              data-testid="message-streaming"
              data-role="assistant"
              className="group/message w-full animate-in fade-in duration-200"
            >
              <div className="flex w-full items-start justify-start gap-2 md:gap-3">
                <div className="-mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ring-border">
                  <SparklesIcon className="size-3.5" />
                </div>
                <div className="w-full whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                  {streamingText}
                  <span className="ml-0.5 inline-block h-4 w-[3px] animate-pulse rounded-full bg-foreground/60" />
                </div>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={endRef} className="min-h-[24px] min-w-[24px] shrink-0" />
        </div>
      </div>

      {/* Scroll-to-bottom button */}
      <button
        aria-label="Scroll to bottom"
        type="button"
        className={cn(
          "absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border bg-background p-2 shadow-lg transition-all hover:bg-muted",
          isAtBottom
            ? "pointer-events-none scale-0 opacity-0"
            : "pointer-events-auto scale-100 opacity-100",
        )}
        onClick={() => scrollToBottom("smooth")}
      >
        <ArrowDownIcon className="size-4" />
      </button>
    </div>
  );
}
