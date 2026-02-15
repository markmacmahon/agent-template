"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
    toast.error(error.message || "Something went wrong");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <p className="text-muted-foreground">
        Something went wrong loading this page.
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
