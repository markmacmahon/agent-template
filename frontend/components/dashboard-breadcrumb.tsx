"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

/**
 * Build breadcrumb trail based on the current pathname.
 *
 * Examples:
 *   /dashboard               → Dashboard
 *   /dashboard/apps          → Dashboard / Apps
 *   /dashboard/apps/new      → Dashboard / Apps / New App
 *   /dashboard/apps/:id/edit → Dashboard / Apps / <App Name>
 */
export function DashboardBreadcrumb({ pageTitle }: DashboardBreadcrumbProps) {
  const pathname = usePathname();
  const { pageTitle: contextTitle } = usePageTitle();

  const crumbs = buildCrumbs(pathname, pageTitle ?? contextTitle);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <span key={crumb.label} className="contents">
            {i > 0 && <BreadcrumbSeparator>/</BreadcrumbSeparator>}
            <BreadcrumbItem>
              {i < crumbs.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

interface Crumb {
  label: string;
  href: string;
}

function buildCrumbs(pathname: string, pageTitle?: string): Crumb[] {
  const crumbs: Crumb[] = [{ label: "Dashboard", href: "/dashboard" }];

  if (pathname === "/dashboard") {
    return crumbs;
  }

  if (pathname.startsWith("/dashboard/apps")) {
    crumbs.push({ label: "Apps", href: "/dashboard/apps" });

    if (pathname === "/dashboard/apps") {
      return crumbs;
    }

    if (pathname === "/dashboard/apps/new") {
      crumbs.push({ label: "New App", href: pathname });
      return crumbs;
    }

    if (pathname.match(/^\/dashboard\/apps\/[^/]+\/edit$/)) {
      crumbs.push({
        label: pageTitle ?? "Edit App",
        href: pathname,
      });
      return crumbs;
    }
  }

  return crumbs;
}
