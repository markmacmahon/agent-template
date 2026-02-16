import { fetchAppById } from "@/components/actions/apps-action";
import { ErrorToast } from "@/components/dashboard/error-toast";
import Link from "next/link";
import { AppViewContent } from "./app-view-content";

interface AppViewPageProps {
  params: Promise<{ id: string }>;
}

export default async function AppViewPage({ params }: AppViewPageProps) {
  const { id } = await params;
  const result = await fetchAppById(id);

  if ("error" in result) {
    return (
      <div className="py-12 text-center">
        <ErrorToast message={result.error} />
        <p className="text-muted-foreground">Could not load app.</p>
        <Link
          href="/dashboard/apps"
          className="mt-4 inline-block text-sm underline text-muted-foreground hover:text-foreground"
        >
          Back to apps
        </Link>
      </div>
    );
  }

  return <AppViewContent app={result.data} />;
}
