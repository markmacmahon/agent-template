import { ChatContainer } from "@/components/chat/chat-container";
import {
  fetchThreads,
  fetchCurrentUserId,
} from "@/components/actions/chat-actions";
import { fetchAppById } from "@/components/actions/apps-action";
import type { ThreadRead } from "@/lib/openapi-client/index";
import { createLogger } from "@/lib/logger";

const logger = createLogger("ChatPage");

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch app name, initial threads, and user ID in parallel
  const [appResult, threadsResult, userResult] = await Promise.all([
    fetchAppById(id),
    fetchThreads(id, undefined, 50),
    fetchCurrentUserId(),
  ]);

  const appName = "data" in appResult ? appResult.data.name : undefined;
  const userId = "data" in userResult ? userResult.data : undefined;

  let initialThreads: ThreadRead[] = [];
  if ("data" in threadsResult) {
    initialThreads = threadsResult.data.items ?? [];
  } else {
    logger.error("Failed to fetch threads:", threadsResult.error);
  }

  return (
    <ChatContainer
      appId={id}
      appName={appName}
      userId={userId}
      initialThreads={initialThreads}
    />
  );
}
