import { SubscribersContainer } from "@/components/subscribers/subscribers-container";
import { fetchAppById } from "@/components/actions/apps-action";

export default async function SubscribersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ subscriber?: string; thread?: string }>;
}) {
  const { id } = await params;
  const { subscriber, thread } = await searchParams;

  // Fetch app
  const appResult = await fetchAppById(id);
  const appName = "data" in appResult ? appResult.data.name : undefined;

  return (
    <SubscribersContainer
      appId={id}
      appName={appName}
      initialSubscriberId={subscriber}
      initialThreadId={thread}
    />
  );
}
