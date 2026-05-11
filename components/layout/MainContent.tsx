'use client';

import { useSidebar } from './SidebarContext';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <main
      className={`min-h-dvh min-w-0 flex-1 flex flex-col transition-[margin] duration-200 ${
        isCollapsed ? 'lg:ml-[4.5rem]' : 'lg:ml-60'
      }`}
    >
      {children}
    </main>
  );
}
