"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/keys";
import { createLogger } from "@/lib/logger";

const logger = createLogger("DashboardError");

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Dashboard error:", error);
    toast.error(error.message || "Something went wrong");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <p className="text-muted-foreground">{t("ERROR_DASHBOARD")}</p>
      <Button variant="outline" onClick={reset}>
        {t("ERROR_TRY_AGAIN")}
      </Button>
    </div>
  );
}
