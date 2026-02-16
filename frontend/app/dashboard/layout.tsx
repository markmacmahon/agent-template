import Link from "next/link";
import { Bot, Blocks } from "lucide-react";

import { DashboardBreadcrumb } from "@/components/dashboard/dashboard-breadcrumb";
import { BreadcrumbProvider } from "@/components/dashboard/breadcrumb-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { logout } from "@/components/actions/logout-action";
import { t } from "@/i18n/keys";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-10 w-16 flex flex-col border-r bg-background p-4">
        <div className="flex flex-col items-center gap-8">
          <Link
            href="/dashboard"
            title={t("NAV_DASHBOARD")}
            className="flex items-center justify-center rounded-full bg-primary/10 p-3 transition-all duration-200 hover:scale-105 hover:bg-primary/20"
          >
            <Bot className="h-8 w-8 text-primary" />
          </Link>
          <Link
            href="/dashboard/apps"
            title={t("NAV_APPS")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <Blocks className="h-5 w-5" />
          </Link>
        </div>
      </aside>
      <BreadcrumbProvider>
        <main className="ml-16 w-full p-8 bg-muted/40">
          <header className="flex justify-between items-center mb-6">
            <DashboardBreadcrumb />
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center justify-center w-10 h-10 rounded-full bg-muted hover:bg-accent">
                    <Avatar>
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="bottom">
                  <DropdownMenuItem>
                    <button onClick={logout} className="block w-full text-left">
                      {t("NAV_LOGOUT")}
                    </button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <section className="grid gap-6">{children}</section>
        </main>
      </BreadcrumbProvider>
    </div>
  );
}
