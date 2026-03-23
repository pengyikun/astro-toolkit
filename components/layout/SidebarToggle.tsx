'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/client';

const SIDEBAR_TOGGLE_EVENT = 'astro-toolkit:sidebar-toggle';
const SIDEBAR_STATE_EVENT = 'astro-toolkit:sidebar-state';

export default function SidebarToggle() {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleSidebarState(event: Event) {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setIsOpen(Boolean(detail?.open));
    }

    window.addEventListener(SIDEBAR_STATE_EVENT, handleSidebarState as EventListener);
    return () => {
      window.removeEventListener(SIDEBAR_STATE_EVENT, handleSidebarState as EventListener);
    };
  }, []);

  return (
    <Button
      id="sidebar-toggle"
      type="button"
      variant="outline"
      size="icon"
      className="fixed left-3 top-3 z-50 h-11 w-11 rounded-2xl bg-panel lg:hidden"
      aria-controls="mobile-sidebar"
      aria-expanded={isOpen}
      aria-label={t('ui.toggleNavigation')}
      onClick={() => window.dispatchEvent(new CustomEvent(SIDEBAR_TOGGLE_EVENT))}
    >
      <svg className="w-5 h-5 text-ink" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </Button>
  );
}
