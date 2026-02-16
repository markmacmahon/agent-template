"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/components/dashboard/breadcrumb-context";
import { MessageSquare, Users, Pencil } from "lucide-react";
import Link from "next/link";
import { t } from "@/i18n/keys";
import type { AppRead } from "@/lib/openapi-client";

interface AppViewContentProps {
  app: AppRead;
}

export function AppViewContent({ app }: AppViewContentProps) {
  const { setPageTitle, setExtraSegments } = usePageTitle();

  useEffect(() => {
    setPageTitle(app.name);
    setExtraSegments([]);
  }, [app.name, setPageTitle, setExtraSegments]);

  return (
    <div className="max-w-4xl">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold text-foreground">{app.name}</h1>
        {app.description && (
          <p className="mt-1 text-lg text-muted-foreground">
            {app.description}
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`/dashboard/apps/${app.id}/chat`}>
            <Button type="button" variant="default" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("NAV_CHAT")}
            </Button>
          </Link>
          <Link
            href={`/dashboard/apps/${app.id}/subscribers`}
            data-testid="app-view-subscribers-link"
          >
            <Button type="button" variant="default" className="gap-2">
              <Users className="h-4 w-4" />
              {t("SUBSCRIBERS_NAV_LINK")}
            </Button>
          </Link>
          <Link href={`/dashboard/apps/${app.id}/edit`}>
            <Button type="button" variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              {t("NAV_EDIT_APP")}
            </Button>
          </Link>
        </div>
      </header>
    </div>
  );
}
