'use client';

import { useEffect, useState } from 'react';

const SIDEBAR_COLLAPSE_EVENT = 'astro-toolkit:sidebar-collapse';

export default function MainContent({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    function handleCollapse(event: Event) {
      const detail = (event as CustomEvent<{ collapsed?: boolean }>).detail;
      setCollapsed(Boolean(detail?.collapsed));
    }

    window.addEventListener(SIDEBAR_COLLAPSE_EVENT, handleCollapse as EventListener);
    return () => {
      window.removeEventListener(SIDEBAR_COLLAPSE_EVENT, handleCollapse as EventListener);
    };
  }, []);

  return (
    <main
      className="min-h-dvh min-w-0 flex-1 flex flex-col transition-[margin] duration-200"
      style={{ marginLeft: undefined }}
    >
      <style>{`
        @media (min-width: 1024px) {
          main { margin-left: ${collapsed ? '4.5rem' : '15rem'} !important; }
        }
      `}</style>
      {children}
    </main>
  );
}
