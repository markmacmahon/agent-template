"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@/i18n/keys";
import { SubscribersList } from "@/components/subscribers-list";
import { ThreadsList } from "@/components/threads-list";
import { ThreadChat, type ThreadChatHandle } from "@/components/thread-chat";
import { usePageTitle } from "@/components/breadcrumb-context";
import { sendMessage } from "@/components/actions/chat-actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SCENARIO_PRESETS } from "@/lib/scenarios";

interface SubscribersContainerProps {
  appId: string;
  appName?: string;
  initialSubscriberId?: string;
  initialThreadId?: string;
}

export function SubscribersContainer({
  appId,
  appName,
  initialSubscriberId,
  initialThreadId,
}: SubscribersContainerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setPageTitle, setExtraSegments } = usePageTitle();
  const threadChatRef = useRef<ThreadChatHandle | null>(null);
  const [selectedSubscriberId, setSelectedSubscriberId] = useState<
    string | null
  >(initialSubscriberId || null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreadId || null,
  );
  const [scenarioRunning, setScenarioRunning] = useState(false);
  const [scenarioValue, setScenarioValue] = useState<string>("");

  // Set breadcrumb
  useEffect(() => {
    if (appName) {
      setPageTitle(appName);
      setExtraSegments([{ label: t("SUBSCRIBERS_PAGE_TITLE") }]);
    }
  }, [appName, setPageTitle, setExtraSegments]);

  // Update URL when selection changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (selectedSubscriberId) {
      params.set("subscriber", selectedSubscriberId);
    } else {
      params.delete("subscriber");
    }

    if (selectedThreadId) {
      params.set("thread", selectedThreadId);
    } else {
      params.delete("thread");
    }

    const newUrl = params.toString()
      ? `/dashboard/apps/${appId}/subscribers?${params.toString()}`
      : `/dashboard/apps/${appId}/subscribers`;

    router.replace(newUrl, { scroll: false });
  }, [selectedSubscriberId, selectedThreadId, appId, router, searchParams]);

  const handleSubscriberSelect = (subscriberId: string) => {
    setSelectedSubscriberId(subscriberId);
    // Clear thread selection when switching subscribers
    setSelectedThreadId(null);
  };

  const handleThreadSelect = (threadId: string) => {
    setSelectedThreadId(threadId);
  };

  const runScenario = async (scenarioId: string) => {
    if (!selectedThreadId) {
      return;
    }
    const scenario = SCENARIO_PRESETS.find(
      (option) => option.id === scenarioId,
    );
    if (!scenario || scenarioRunning) {
      return;
    }

    setScenarioRunning(true);
    try {
      for (const step of scenario.steps) {
        if (!selectedThreadId) {
          break;
        }
        if (step.role === "user") {
          const result = await sendMessage(
            appId,
            selectedThreadId,
            step.content,
          );
          if ("error" in result) {
            console.error("Scenario failed to add user message:", result.error);
            break;
          }
          threadChatRef.current?.refreshMessages?.();
        } else {
          await threadChatRef.current?.streamScenarioMessage?.(step);
        }

        if (step.pauseMs) {
          await new Promise((resolve) => setTimeout(resolve, step.pauseMs));
        }
      }
    } finally {
      setScenarioRunning(false);
    }
  };

  const handleScenarioChange = async (value: string) => {
    setScenarioValue(value);
    await runScenario(value);
    setScenarioValue("");
  };

  const scenarioLabel = scenarioRunning
    ? t("CHAT_SCENARIO_RUNNING")
    : scenarioValue
      ? t(
          SCENARIO_PRESETS.find((opt) => opt.id === scenarioValue)?.labelKey ??
            "CHAT_SCENARIO_PLACEHOLDER",
        )
      : t("CHAT_SCENARIO_PLACEHOLDER");

  return (
    <div
      data-testid="subscribers-container"
      className="flex h-[calc(100vh-4rem)] overflow-hidden"
    >
      {/* Left Panel: Subscribers List */}
      <div
        data-testid="subscribers-panel"
        className="w-80 border-r flex-shrink-0 overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b">
          <h2
            className="text-lg font-semibold"
            data-testid="subscribers-panel-title"
          >
            {t("SUBSCRIBERS_LIST_TITLE")}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SubscribersList
            appId={appId}
            selectedSubscriberId={selectedSubscriberId}
            onSubscriberSelect={handleSubscriberSelect}
          />
        </div>
      </div>

      {/* Middle Panel: Threads List */}
      <div
        data-testid="subscribers-threads-panel"
        className="w-80 border-r flex-shrink-0 overflow-hidden flex flex-col"
      >
        <div className="p-4 border-b">
          <h2
            className="text-lg font-semibold"
            data-testid="subscribers-threads-panel-title"
          >
            {t("SUBSCRIBERS_THREADS_TITLE")}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {selectedSubscriberId ? (
            <ThreadsList
              appId={appId}
              subscriberId={selectedSubscriberId}
              selectedThreadId={selectedThreadId}
              onThreadSelect={handleThreadSelect}
            />
          ) : (
            <div
              className="p-4 text-center text-muted-foreground"
              data-testid="subscribers-select-subscriber-msg"
            >
              {t("SUBSCRIBERS_SELECT_SUBSCRIBER")}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Thread Chat */}
      <div
        data-testid="subscribers-chat-panel"
        className="flex-1 overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h2 className="text-lg font-semibold">
            {t("SUBSCRIBERS_CHAT_TITLE")}
          </h2>
          <Select
            disabled={!selectedThreadId || scenarioRunning}
            value={scenarioValue}
            onValueChange={handleScenarioChange}
          >
            <SelectTrigger
              className="w-56"
              data-testid="subscribers-scenario-select"
            >
              <span className="truncate text-sm">{scenarioLabel}</span>
            </SelectTrigger>
            <SelectContent align="end">
              {SCENARIO_PRESETS.map((option) => (
                <SelectItem
                  key={option.id}
                  value={option.id}
                  className="flex flex-col"
                >
                  <span className="text-sm font-medium">
                    {t(option.labelKey)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t(option.descriptionKey)}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 overflow-hidden">
          {selectedThreadId && selectedSubscriberId ? (
            <ThreadChat
              ref={threadChatRef}
              appId={appId}
              threadId={selectedThreadId}
            />
          ) : (
            <div
              className="flex items-center justify-center h-full text-muted-foreground"
              data-testid="subscribers-select-thread-msg"
            >
              {t("SUBSCRIBERS_SELECT_THREAD")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
