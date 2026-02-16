import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Bot } from "lucide-react";
import { t } from "@/i18n/keys";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-muted p-8">
      <div className="text-center max-w-2xl">
        <div className="mb-8 flex flex-col items-center gap-6">
          <div className="rounded-full bg-primary p-6">
            <Bot className="h-16 w-16 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold text-foreground">
            {t("HOME_TITLE")}
          </h1>
        </div>
        <p className="text-lg text-muted-foreground mb-8">
          {t("HOME_SUBTITLE")}
        </p>

        {/* Link to Dashboard */}
        <Link href="/dashboard">
          <Button className="px-8 py-4 text-xl font-semibold rounded-full shadow-lg">
            {t("HOME_CTA")}
          </Button>
        </Link>
      </div>
    </main>
  );
}
