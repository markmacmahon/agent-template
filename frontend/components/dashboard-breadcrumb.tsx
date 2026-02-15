"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { usePageTitle } from "@/components/breadcrumb-context";

interface DashboardBreadcrumbProps {
  pageTitle?: string;
}

export function DashboardBreadcrumb({ pageTitle }: DashboardBreadcrumbProps) {
  const pathname = usePathname();
  const { pageTitle: contextTitle } = usePageTitle();

  const tail = resolvePageLabel(pathname, pageTitle ?? contextTitle);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <span>Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>/</BreadcrumbSeparator>

        {tail ? (
          <>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  <span>Dashboard</span>
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>{tail}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : (
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function resolvePageLabel(pathname: string, pageTitle?: string): string | null {
  if (pathname === "/dashboard/apps/new") {
    return "New App";
  }

  if (pathname.match(/^\/dashboard\/apps\/[^/]+\/edit$/)) {
    return pageTitle ?? "Edit App";
  }

  return null;
}
