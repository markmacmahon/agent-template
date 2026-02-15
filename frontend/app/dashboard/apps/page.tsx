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
import { PageSizeSelector } from "@/components/page-size-selector";
import { PagePagination } from "@/components/page-pagination";
import { ErrorToast } from "@/components/error-toast";

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
        <h2 className="text-2xl font-semibold">Apps</h2>
        <Link href="/dashboard/apps/new">
          <Button variant="outline">Add New App</Button>
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
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-16 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!apps.items?.length ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              apps.items.map((app, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Link href={`/dashboard/apps/${app.id}/edit`}>
                      {app.name}
                    </Link>
                  </TableCell>
                  <TableCell>{app.description}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="cursor-pointer p-1 text-muted-foreground hover:text-foreground">
                        <span className="text-lg font-semibold">...</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="p-2">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/apps/${app.id}/edit`}>
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DeleteButton appId={app.id} />
                      </DropdownMenuContent>
                    </DropdownMenu>
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
