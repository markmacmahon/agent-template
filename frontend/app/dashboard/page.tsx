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
import { DeleteButton } from "./deleteButton";
import { ReadAppResponse } from "@/app/openapi-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PageSizeSelector } from "@/components/page-size-selector";
import { PagePagination } from "@/components/page-pagination";

interface DashboardPageProps {
  searchParams: Promise<{
    page?: string;
    size?: string;
  }>;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const size = Number(params.size) || 10;

  const apps = (await fetchApps(page, size)) as ReadAppResponse;
  const totalPages = Math.ceil((apps.total || 0) / size);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Welcome to your Dashboard</h2>
      <p className="text-lg mb-6">
        Here, you can see the overview of your apps and manage them.
      </p>

      <div className="mb-6">
        <Link href="/dashboard/apps/new">
          <Button variant="outline" className="text-lg px-4 py-2">
            Add New App
          </Button>
        </Link>
      </div>

      <section className="p-6 bg-card rounded-lg shadow-lg mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Apps</h2>
          <PageSizeSelector currentSize={size} />
        </div>

        <Table className="min-w-full text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center">Actions</TableHead>
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
                  <TableCell>{app.name}</TableCell>
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

        {/* Pagination Controls */}
        <PagePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={size}
          totalItems={apps.total || 0}
          basePath="/dashboard"
        />
      </section>
    </div>
  );
}
