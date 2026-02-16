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
import {
  usePageTitle,
  type BreadcrumbSegment,
} from "@/components/dashboard/breadcrumb-context";
import { t } from "@/i18n/keys";

interface DashboardBreadcrumbProps {
  pageTitle?: string;
}

/**
 * Build breadcrumb trail based on the current pathname.
 *
 * Examples:
 *   /dashboard                    → Dashboard
 *   /dashboard/apps               → Dashboard / Apps
 *   /dashboard/apps/new           → Dashboard / Apps / New App
 *   /dashboard/apps/:id           → Dashboard / Apps / <App Name>
 *   /dashboard/apps/:id/edit      → Dashboard / Apps / <App Name> / Edit App
 *   /dashboard/apps/:id/chat      → Dashboard / Apps / <App Name> / Chat
 *   /dashboard/apps/:id/subscribers → Dashboard / Apps / <App Name> / Subscribers
 */
export function DashboardBreadcrumb({ pageTitle }: DashboardBreadcrumbProps) {
  const pathname = usePathname();
  const { pageTitle: contextTitle, extraSegments } = usePageTitle();

  const crumbs = buildCrumbs(
    pathname,
    pageTitle ?? contextTitle,
    extraSegments,
  );

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, i) => (
          <span key={`${crumb.href}-${crumb.label}`} className="contents">
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

function buildCrumbs(
  pathname: string,
  pageTitle?: string,
  extraSegments: BreadcrumbSegment[] = [],
): Crumb[] {
  const crumbs: Crumb[] = [{ label: t("NAV_DASHBOARD"), href: "/dashboard" }];

  if (pathname === "/dashboard") {
    return crumbs;
  }

  if (pathname.startsWith("/dashboard/apps")) {
    crumbs.push({ label: t("NAV_APPS"), href: "/dashboard/apps" });

    if (pathname === "/dashboard/apps") {
      return crumbs;
    }

    if (pathname === "/dashboard/apps/new") {
      crumbs.push({ label: t("NAV_NEW_APP"), href: pathname });
      return crumbs;
    }

    // Extract app ID for app view, edit, chat, subscribers
    const appIdMatch = pathname.match(/^\/dashboard\/apps\/([^/]+)/);
    const appId = appIdMatch?.[1];
    const appPageHref = appId ? `/dashboard/apps/${appId}` : "";

    // App view page: /dashboard/apps/:id
    if (pathname.match(/^\/dashboard\/apps\/[^/]+$/)) {
      crumbs.push({
        label: pageTitle ?? appId ?? t("NAV_APPS"),
        href: pathname,
      });
      return crumbs;
    }

    if (pathname.match(/^\/dashboard\/apps\/[^/]+\/edit$/)) {
      crumbs.push({
        label: pageTitle ?? appId ?? t("NAV_APPS"),
        href: appPageHref,
      });
      crumbs.push({
        label: t("NAV_EDIT_APP"),
        href: pathname,
      });
      return crumbs;
    }

    if (pathname.match(/^\/dashboard\/apps\/[^/]+\/chat$/)) {
      crumbs.push({
        label: pageTitle ?? appId ?? t("NAV_APPS"),
        href: appPageHref,
      });
      crumbs.push({
        label: t("NAV_CHAT"),
        href: pathname,
      });
      for (const seg of extraSegments) {
        crumbs.push({
          label: seg.label,
          href: seg.href ?? pathname,
        });
      }
      return crumbs;
    }

    if (pathname.match(/^\/dashboard\/apps\/[^/]+\/subscribers$/)) {
      crumbs.push({
        label: pageTitle ?? appId ?? t("NAV_APPS"),
        href: appPageHref,
      });
      crumbs.push({
        label: t("SUBSCRIBERS_NAV_LINK"),
        href: pathname,
      });
      return crumbs;
    }
  }

  return crumbs;
}
