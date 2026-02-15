"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface BreadcrumbContextValue {
  pageTitle: string | undefined;
  setPageTitle: (title: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  pageTitle: undefined,
  setPageTitle: () => {},
});

export function BreadcrumbProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pageTitle, setPageTitleState] = useState<string | undefined>(
    undefined,
  );
  const setPageTitle = useCallback((title: string) => {
    setPageTitleState(title);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function usePageTitle() {
  return useContext(BreadcrumbContext);
}
