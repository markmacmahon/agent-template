import { fetchAppById } from "@/components/actions/apps-action";
import { EditAppForm } from "./edit-app-form";
import { AppRead } from "@/app/openapi-client";

interface EditAppPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditAppPage({ params }: EditAppPageProps) {
  const { id } = await params;
  const result = await fetchAppById(id);

  if (!("name" in result)) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto p-6">
          <p className="text-destructive">App not found.</p>
        </div>
      </div>
    );
  }

  const app = result as AppRead;

  return <EditAppForm app={app} />;
}
