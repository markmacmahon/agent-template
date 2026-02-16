"use client";

import type { ThreadRead } from "@/lib/openapi-client/index";
import { cn } from "@/lib/utils";
import { MessageSquareIcon } from "lucide-react";
import { t } from "@/i18n/keys";
import { EditableTitle } from "@/components/chat/editable-title";

interface ThreadListProps {
  threads: ThreadRead[];
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string | null) => void;
  onThreadTitleChange: (
    threadId: string,
    newTitle: string,
  ) => void | Promise<void>;
}

export function ThreadList({
  threads,
  selectedThreadId,
  onThreadSelect,
  onThreadTitleChange,
}: ThreadListProps) {
  const showEmptyState = threads.length === 0;

  if (showEmptyState) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <MessageSquareIcon className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          {t("CHAT_NO_CONVERSATIONS")}
          <br />
          {t("CHAT_START_BELOW")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col py-1">
        {threads.map((thread) => (
          <div
            key={thread.id}
            role="button"
            tabIndex={0}
            onClick={() => onThreadSelect(thread.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onThreadSelect(thread.id);
              }
            }}
            className={cn(
              "mx-1.5 rounded-md px-3 py-2.5 text-left transition-colors cursor-pointer",
              "hover:bg-accent/60",
              selectedThreadId === thread.id
                ? "bg-accent text-accent-foreground"
                : "text-foreground",
            )}
          >
            <EditableTitle
              value={thread.title ?? ""}
              placeholder={t("CHAT_NEW_CONVERSATION")}
              onSave={(newTitle) => onThreadTitleChange(thread.id, newTitle)}
              stopPropagation
              className="leading-snug"
            />
            {thread.customer_id && (
              <div className="mt-0.5 text-xs text-muted-foreground truncate">
                {thread.customer_id}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
