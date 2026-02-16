"use client";

import { useEffect, useMemo, useState } from "react";
import { t } from "@/i18n/keys";
import { fetchSubscriberThreads } from "@/components/actions/subscribers-actions";
import type { ThreadSummary } from "@/app/openapi-client";
import { Button } from "@/components/ui/button";

interface ThreadsListProps {
  appId: string;
  subscriberId: string;
  selectedThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
}

export function ThreadsList({
  appId,
  subscriberId,
  selectedThreadId,
  onThreadSelect,
}: ThreadsListProps) {
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch threads when subscriber changes
  useEffect(() => {
    setThreads([]);
    setLoading(true);
    setError(null);
    setNextCursor(null);
  }, [subscriberId]);

  // Fetch threads
  useEffect(() => {
    let cancelled = false;
    async function loadThreads() {
      setLoading(true);
      setError(null);

      const result = await fetchSubscriberThreads(appId, subscriberId);

      if (cancelled) return;

      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setThreads(result.data.items);
      setNextCursor(result.data.next_cursor ?? null);
      setHasMore(Boolean(result.data.next_cursor));
      setLoading(false);
    }

    loadThreads();
    return () => {
      cancelled = true;
    };
  }, [appId, subscriberId]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    const result = await fetchSubscriberThreads(
      appId,
      subscriberId,
      nextCursor,
    );

    if ("error" in result) {
      setError(result.error);
      setLoadingMore(false);
      return;
    }

    setThreads((prev) => [...prev, ...result.data.items]);
    setNextCursor(result.data.next_cursor ?? null);
    setHasMore(Boolean(result.data.next_cursor));
    setLoadingMore(false);
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const messageCountLabel = useMemo(() => {
    return (count: number) =>
      count === 1
        ? t("SUBSCRIBERS_MESSAGE_COUNT_ONE")
        : t("SUBSCRIBERS_MESSAGE_COUNT_OTHER").replace(
            "{count}",
            String(count),
          );
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div
            className="p-4 text-center text-sm text-red-500"
            data-testid="threads-error"
          >
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="p-4 space-y-3" data-testid="threads-loading">
            {[0, 1].map((index) => (
              <div
                key={index}
                className="animate-pulse rounded-lg border border-dashed border-muted-foreground/30 p-4"
              >
                <div className="h-4 w-2/3 rounded bg-muted mb-2" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {threads.length === 0 && !loading && !error ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {t("SUBSCRIBERS_NO_THREADS")}
            </p>
          </div>
        ) : (
          <>
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => onThreadSelect(thread.id)}
                className={`w-full text-left p-4 border-b hover:bg-accent transition-colors ${
                  selectedThreadId === thread.id ? "bg-accent" : ""
                }`}
                data-testid={`subscriber-thread-${thread.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {thread.title || `Thread ${thread.id.slice(0, 8)}`}
                    </p>
                    {thread.last_message_preview && (
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {thread.last_message_preview}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(thread.updated_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {messageCountLabel(thread.message_count ?? 0)}
                  </span>
                </div>
              </button>
            ))}

            {hasMore && !loading && (
              <div className="p-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  className="w-full"
                  disabled={loadingMore}
                  data-testid="threads-load-more"
                >
                  {loadingMore
                    ? t("SUBSCRIBERS_LOADING_MORE")
                    : t("SUBSCRIBERS_LOAD_MORE")}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
