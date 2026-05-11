'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface SidebarContextValue {
  isMobileOpen: boolean;
  isCollapsed: boolean;
  toggleMobile: () => void;
  setMobileOpen: (open: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleMobile = useCallback(() => setIsMobileOpen((prev) => !prev), []);
  const toggleCollapsed = useCallback(() => setIsCollapsed((prev) => !prev), []);
  const setMobileOpen = useCallback((open: boolean) => setIsMobileOpen(open), []);

  const value = useMemo<SidebarContextValue>(
    () => ({ isMobileOpen, isCollapsed, toggleMobile, setMobileOpen, toggleCollapsed }),
    [isMobileOpen, isCollapsed, toggleMobile, setMobileOpen, toggleCollapsed],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return ctx;
}
