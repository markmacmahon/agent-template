"use client";

import { createContext, useContext, useState, useCallback } from "react";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface BreadcrumbContextValue {
  pageTitle: string | undefined;
  setPageTitle: (title: string) => void;
  extraSegments: BreadcrumbSegment[];
  setExtraSegments: (segments: BreadcrumbSegment[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  pageTitle: undefined,
  setPageTitle: () => {},
  extraSegments: [],
  setExtraSegments: () => {},
});

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageTitle, setPageTitleState] = useState<string | undefined>(
    undefined,
  );
  const [extraSegments, setExtraSegmentsState] = useState<BreadcrumbSegment[]>(
    [],
  );
  const setPageTitle = useCallback((title: string) => {
    setPageTitleState(title);
  }, []);
  const setExtraSegments = useCallback((segments: BreadcrumbSegment[]) => {
    setExtraSegmentsState(segments);
  }, []);

  return (
    <BreadcrumbContext.Provider
      value={{ pageTitle, setPageTitle, extraSegments, setExtraSegments }}
    >
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function usePageTitle() {
  return useContext(BreadcrumbContext);
}
