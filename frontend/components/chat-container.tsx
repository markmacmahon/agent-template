"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageList } from "@/components/message-list";
import { MessageInput } from "@/components/message-input";
import type { ThreadRead, MessageRead } from "@/app/openapi-client/index";
import {
  fetchMessages,
  sendMessage,
  createNewThread,
  updateThreadTitle,
} from "@/components/actions/chat-actions";
import { useChatStream } from "@/hooks/use-chat-stream";
import { usePageTitle } from "@/components/breadcrumb-context";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, PlusIcon } from "lucide-react";
import { ThreadList } from "@/components/thread-list";
import { EditableTitle } from "@/components/editable-title";
import { cn } from "@/lib/utils";
import { t } from "@/i18n/keys";

interface ChatContainerProps {
  appId: string;
  appName?: string;
  initialThreads?: ThreadRead[];
}

export function ChatContainer({
  appId,
  appName,
  initialThreads = [],
}: ChatContainerProps) {
  const [threads, setThreads] = useState<ThreadRead[]>(initialThreads);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRead[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  /** When true, show a "New conversation" row at top of list (not persisted until first message). Only one allowed. */
  const [hasNewConversationPlaceholder, setHasNewConversationPlaceholder] =
    useState(false);
  const { setPageTitle, setExtraSegments } = usePageTitle();

  const { streamingText, status, startStream, stopStream } = useChatStream({
    appId,
    threadId: selectedThreadId || "",
    onMessageComplete: async (message) => {
      // Refetch from server using the thread ID from the message to avoid stale closure issues
      const result = await fetchMessages(appId, message.thread_id, 100);
      if ("error" in result) {
        console.error("Failed to fetch messages after stream:", result.error);
        return;
      }
      setMessages(result.data);
    },
    onError: (error) => {
      console.error("Stream error:", error);
    },
  });

  // Set breadcrumb: app name as page title, thread title as extra segment
  useEffect(() => {
    if (appName) {
      setPageTitle(appName);
    }
  }, [appName, setPageTitle]);

  const selectedThread = threads.find((th) => th.id === selectedThreadId);
  useEffect(() => {
    if (selectedThread?.title) {
      setExtraSegments([{ label: selectedThread.title }]);
    } else {
      setExtraSegments([]);
    }
  }, [selectedThread?.title, selectedThread?.id, setExtraSegments]);

  // Fetch messages when thread is selected
  useEffect(() => {
    async function loadMessages() {
      if (!selectedThreadId) {
        setMessages([]);
        return;
      }

      const result = await fetchMessages(appId, selectedThreadId, 100);
      if ("error" in result) {
        console.error("Failed to fetch messages:", result.error);
        return;
      }

      setMessages(result.data);
    }

    loadMessages();
  }, [appId, selectedThreadId]);

  const handleSendMessage = useCallback(
    async (content: string) => {
      let threadId = selectedThreadId;

      // Auto-create thread if none selected (persist the "New conversation" placeholder)
      if (!threadId) {
        const customerId = `customer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const threadResult = await createNewThread(
          appId,
          customerId,
          content.slice(0, 50),
        );

        if ("error" in threadResult) {
          console.error("Failed to create thread:", threadResult.error);
          return;
        }

        threadId = threadResult.data.id;
        setThreads((prev) => [threadResult.data, ...prev]);
        setSelectedThreadId(threadId);
        setHasNewConversationPlaceholder(false);
      }

      // Send user message
      const messageResult = await sendMessage(appId, threadId, content);

      if ("error" in messageResult) {
        console.error("Failed to send message:", messageResult.error);
        return;
      }

      setMessages((prev) => [...prev, messageResult.data]);

      // Small delay to ensure database transaction is committed
      await new Promise((resolve) => setTimeout(resolve, 200));

      startStream(threadId);
    },
    [appId, selectedThreadId, startStream],
  );

  const handleNewConversation = () => {
    setSelectedThreadId(null);
    setMessages([]);
    if (!hasNewConversationPlaceholder) {
      setHasNewConversationPlaceholder(true);
    }
  };

  const handleThreadTitleChange = useCallback(
    async (threadId: string, newTitle: string) => {
      const result = await updateThreadTitle(threadId, newTitle);
      if ("error" in result) {
        console.error("Failed to update thread title:", result.error);
        return;
      }
      setThreads((prev) =>
        prev.map((th) => (th.id === threadId ? result.data : th)),
      );
    },
    [],
  );

  /** Persist "New conversation" by creating a thread with the given title (editing title = interaction). */
  const handleNewConversationTitleSave = useCallback(
    async (title: string) => {
      if (!title.trim()) return;
      const customerId = `customer-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const threadResult = await createNewThread(
        appId,
        customerId,
        title.trim(),
      );
      if ("error" in threadResult) {
        console.error("Failed to create thread:", threadResult.error);
        return;
      }
      setThreads((prev) => [threadResult.data, ...prev]);
      setSelectedThreadId(threadResult.data.id);
      setHasNewConversationPlaceholder(false);
    },
    [appId],
  );

  const isStreaming = status === "streaming";

  return (
    <div
      data-testid="chat-container"
      className="-mx-8 -mb-8 flex h-[calc(100dvh-6rem)] overflow-hidden border-t border-border bg-background"
    >
      {/* ── Sidebar: slides in from left ── */}
      <div
        data-testid="chat-sidebar-wrapper"
        data-state={isSidebarOpen ? "open" : "closed"}
        className={cn(
          "flex shrink-0 overflow-hidden transition-[width] duration-300 ease-out",
          isSidebarOpen ? "w-72" : "w-0",
          "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:transition-[transform,width]",
          isSidebarOpen
            ? "max-md:w-72 max-md:translate-x-0"
            : "max-md:w-72 max-md:-translate-x-full",
        )}
        aria-hidden={!isSidebarOpen}
      >
        <aside
          data-testid="chat-sidebar"
          className={cn(
            "flex h-full w-72 min-w-72 flex-col border-r border-border bg-muted/30 transition-transform duration-300 ease-out",
            "max-md:bg-background max-md:shadow-xl max-md:translate-x-0",
            isSidebarOpen
              ? "translate-x-0"
              : "-translate-x-full max-md:!translate-x-0",
          )}
        >
          {/* Sidebar header */}
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-3">
            <span
              data-testid="chat-sidebar-title"
              className="truncate text-sm font-semibold text-foreground"
            >
              {t("CHAT_SIDEBAR_TITLE")}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={handleNewConversation}
              title={t("CHAT_NEW_CONVERSATION")}
            >
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Thread list */}
          <ThreadList
            threads={threads}
            selectedThreadId={selectedThreadId}
            showNewConversationAtTop={hasNewConversationPlaceholder}
            onThreadSelect={(id) => {
              setSelectedThreadId(id);
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setIsSidebarOpen(false);
              }
            }}
            onThreadTitleChange={handleThreadTitleChange}
          />
        </aside>
      </div>

      {/* Mobile overlay backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 transition-opacity duration-200 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main chat area ── */}
      <div className="flex min-w-0 flex-1 touch-pan-y flex-col bg-background">
        {/* Chat header */}
        <header
          data-testid="chat-header"
          className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2"
        >
          <Button
            data-testid="chat-sidebar-toggle"
            variant="outline"
            size="icon"
            className="h-8 shrink-0 px-2"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={
              isSidebarOpen ? t("CHAT_SIDEBAR_CLOSE") : t("CHAT_SIDEBAR_OPEN")
            }
            aria-label={
              isSidebarOpen ? t("CHAT_SIDEBAR_CLOSE") : t("CHAT_SIDEBAR_OPEN")
            }
          >
            {isSidebarOpen ? (
              <ChevronLeft className="size-4" aria-hidden />
            ) : (
              <ChevronRight className="size-4" aria-hidden />
            )}
          </Button>

          {(!isSidebarOpen || typeof window !== "undefined") && (
            <div className="min-w-0 flex-1 flex items-center">
              {selectedThread ? (
                <h1 className="min-w-0 flex-1 text-sm font-medium">
                  <EditableTitle
                    value={selectedThread.title ?? ""}
                    placeholder={t("CHAT_DEFAULT_TITLE")}
                    onSave={(newTitle) =>
                      handleThreadTitleChange(selectedThread.id, newTitle)
                    }
                    className="truncate"
                  />
                </h1>
              ) : hasNewConversationPlaceholder ? (
                <h1 className="min-w-0 flex-1 text-sm font-medium text-muted-foreground">
                  <EditableTitle
                    value=""
                    placeholder={t("CHAT_NEW_CONVERSATION")}
                    onSave={handleNewConversationTitleSave}
                    className="truncate"
                  />
                </h1>
              ) : (
                <h1 className="text-sm font-medium text-muted-foreground">
                  {t("CHAT_NEW_CONVERSATION")}
                </h1>
              )}
            </div>
          )}

          {!isSidebarOpen && (
            <Button
              variant="outline"
              className="ml-auto h-8 px-2"
              onClick={handleNewConversation}
            >
              <PlusIcon className="size-4" />
              <span className="md:sr-only">{t("CHAT_NEW_CHAT")}</span>
            </Button>
          )}
        </header>

        {/* Messages — fills remaining space */}
        <MessageList messages={messages} streamingText={streamingText} />

        {/* Input — pinned to bottom */}
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={isStreaming}
          onStop={isStreaming ? stopStream : undefined}
          placeholder={
            isStreaming
              ? t("CHAT_PLACEHOLDER_STREAMING")
              : t("CHAT_PLACEHOLDER")
          }
        />
      </div>
    </div>
  );
}
