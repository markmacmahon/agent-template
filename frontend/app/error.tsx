"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n/keys";
import { createLogger } from "@/lib/logger";

const logger = createLogger("GlobalError");

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Application error:", error);
    toast.error(error.message || "Something went wrong");
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <p className="text-muted-foreground">{t("ERROR_GENERIC")}</p>
      <Button variant="outline" onClick={reset}>
        {t("ERROR_TRY_AGAIN")}
      </Button>
    </div>
  );
}
