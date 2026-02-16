import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { fetchApps } from "@/components/actions/apps-action";
import { DeleteButton } from "./delete-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MessageSquare, Users, MoreHorizontal } from "lucide-react";
import { PageSizeSelector } from "@/components/dashboard/page-size-selector";
import { PagePagination } from "@/components/dashboard/page-pagination";
import { ErrorToast } from "@/components/dashboard/error-toast";
import { t } from "@/i18n/keys";

interface AppsPageProps {
  searchParams: Promise<{
    page?: string;
    size?: string;
  }>;
}

export default async function AppsPage({ searchParams }: AppsPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const size = Number(params.size) || 10;

  const result = await fetchApps(page, size);
  const hasError = "error" in result;
  const apps = hasError ? { items: [], total: 0 } : result.data;
  const totalPages = Math.ceil((apps.total || 0) / size);

  return (
    <div className="max-w-4xl">
      {hasError && <ErrorToast message={result.error} />}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">{t("APP_HEADING")}</h2>
        <Link href="/dashboard/apps/new">
          <Button variant="outline">{t("APP_ADD_NEW")}</Button>
        </Link>
      </div>

      <section className="p-6 bg-card rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <PageSizeSelector currentSize={size} />
          <PagePagination
            currentPage={page}
            totalPages={totalPages}
            pageSize={size}
            totalItems={apps.total || 0}
            basePath="/dashboard/apps"
          />
        </div>

        <Table className="text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>{t("APP_TABLE_NAME")}</TableHead>
              <TableHead>{t("APP_TABLE_DESCRIPTION")}</TableHead>
              <TableHead className="w-16 text-center">
                {t("APP_TABLE_ACTIONS")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!apps.items?.length ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  {t("APP_TABLE_EMPTY")}
                </TableCell>
              </TableRow>
            ) : (
              apps.items.map((app, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Link
                      href={`/dashboard/apps/${app.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {app.name}
                    </Link>
                  </TableCell>
                  <TableCell>{app.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/dashboard/apps/${app.id}/chat`}
                        title={t("APP_ACTION_CHAT")}
                        className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={t("APP_ACTION_CHAT")}
                      >
                        <MessageSquare className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/dashboard/apps/${app.id}/subscribers`}
                        title={t("SUBSCRIBERS_NAV_LINK")}
                        className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={t("SUBSCRIBERS_NAV_LINK")}
                      >
                        <Users className="h-5 w-5" />
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                          aria-label={t("APP_TABLE_ACTIONS")}
                        >
                          <MoreHorizontal className="h-5 w-5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="p-2" align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/apps/${app.id}/edit`}>
                              {t("NAV_EDIT_APP")}
                            </Link>
                          </DropdownMenuItem>
                          <DeleteButton appId={app.id} />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
