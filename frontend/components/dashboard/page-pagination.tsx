import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { t } from "@/i18n/keys";

interface PagePaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  basePath?: string;
}

export function PagePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  basePath = "/dashboard/apps",
}: PagePaginationProps) {
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const buildUrl = (page: number) =>
    `${basePath}?page=${page}&size=${pageSize}`;

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      <span className="mr-2 whitespace-nowrap">
        {totalItems === 0
          ? t("PAGINATION_NO_RESULTS")
          : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, totalItems)} of ${totalItems}`}
      </span>

      <Link
        href={buildUrl(1)}
        className={!hasPreviousPage ? "pointer-events-none opacity-50" : ""}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasPreviousPage}
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      </Link>

      <Link
        href={buildUrl(currentPage - 1)}
        className={!hasPreviousPage ? "pointer-events-none opacity-50" : ""}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasPreviousPage}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </Link>

      <Link
        href={buildUrl(currentPage + 1)}
        className={hasNextPage ? "" : "pointer-events-none opacity-50"}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasNextPage}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </Link>

      <Link
        href={buildUrl(totalPages)}
        className={hasNextPage ? "" : "pointer-events-none opacity-50"}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={!hasNextPage}
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
