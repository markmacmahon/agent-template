"use client";

import { useEffect, useMemo, useState } from "react";
import { t } from "@/i18n/keys";
import { fetchSubscribers } from "@/components/actions/subscribers-actions";
import type { SubscriberSummary } from "@/lib/openapi-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SubscribersListProps {
  appId: string;
  selectedSubscriberId: string | null;
  onSubscriberSelect: (subscriberId: string) => void;
}

export function SubscribersList({
  appId,
  selectedSubscriberId,
  onSubscriberSelect,
}: SubscribersListProps) {
  const [subscribers, setSubscribers] = useState<SubscriberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounce, setSearchDebounce] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch subscribers
  useEffect(() => {
    let cancelled = false;
    async function loadSubscribers() {
      setLoading(true);
      setError(null);
      setNextCursor(null);

      const result = await fetchSubscribers(
        appId,
        undefined,
        25,
        searchDebounce || undefined,
      );

      if (cancelled) return;

      if ("error" in result) {
        setError(result.error);
        setSubscribers([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      setSubscribers(result.data.items);
      setNextCursor(result.data.next_cursor ?? null);
      setHasMore(Boolean(result.data.next_cursor));
      setLoading(false);
    }

    loadSubscribers();
    return () => {
      cancelled = true;
    };
  }, [appId, searchDebounce]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    const result = await fetchSubscribers(
      appId,
      nextCursor,
      25,
      searchDebounce || undefined,
    );

    if ("error" in result) {
      setError(result.error);
      setLoadingMore(false);
      return;
    }

    setSubscribers((prev) => [...prev, ...result.data.items]);
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

  const threadCountLabel = useMemo(() => {
    return (count: number) =>
      count === 1
        ? t("SUBSCRIBERS_THREAD_COUNT_ONE")
        : t("SUBSCRIBERS_THREAD_COUNT_OTHER").replace("{count}", String(count));
  }, []);

  const isEmpty = !loading && subscribers.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("SUBSCRIBERS_SEARCH_PLACEHOLDER")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="subscribers-search"
          />
        </div>
      </div>

      {/* Subscribers List */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <div
            className="p-4 text-center text-sm text-red-500"
            data-testid="subscribers-error"
          >
            {error}
          </div>
        )}

        {loading && !error && (
          <div className="p-4 space-y-3" data-testid="subscribers-loading">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="animate-pulse rounded-lg border border-dashed border-muted-foreground/30 p-4"
              >
                <div className="h-4 w-1/2 rounded bg-muted mb-2" />
                <div className="h-3 w-1/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        )}

        {isEmpty && !loading && !error && (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              {t("SUBSCRIBERS_NO_SUBSCRIBERS")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("SUBSCRIBERS_NO_SUBSCRIBERS_DESCRIPTION")}
            </p>
          </div>
        )}

        {!loading && !error && subscribers.length > 0 && (
          <>
            {subscribers.map((subscriber) => (
              <button
                key={subscriber.id}
                onClick={() => onSubscriberSelect(subscriber.id)}
                className={`w-full text-left p-4 border-b hover:bg-accent transition-colors ${
                  selectedSubscriberId === subscriber.id ? "bg-accent" : ""
                }`}
                data-testid={`subscriber-row-${subscriber.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {subscriber.display_name || subscriber.customer_id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {subscriber.display_name
                        ? subscriber.customer_id
                        : t("SUBSCRIBERS_NO_MESSAGES_SHORT")}
                    </p>
                    {subscriber.last_message_preview && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {subscriber.last_message_preview}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimestamp(
                      subscriber.last_message_at ??
                        subscriber.created_at ??
                        null,
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>{threadCountLabel(subscriber.thread_count ?? 0)}</span>
                </div>
              </button>
            ))}

            {hasMore && (
              <div className="p-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  className="w-full"
                  data-testid="subscribers-load-more"
                  disabled={loadingMore}
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
