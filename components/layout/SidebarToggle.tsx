'use client';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/client';
import { useSidebar } from './SidebarContext';

export default function SidebarToggle() {
  const { t } = useLocale();
  const { isMobileOpen, toggleMobile } = useSidebar();

  return (
    <Button
      id="sidebar-toggle"
      type="button"
      variant="outline"
      size="icon"
      className="fixed left-3 top-3 z-50 h-11 w-11 rounded-2xl bg-panel lg:hidden"
      aria-controls="mobile-sidebar"
      aria-expanded={isMobileOpen}
      aria-label={t('ui.toggleNavigation')}
      onClick={toggleMobile}
    >
      <svg className="w-5 h-5 text-ink" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    </Button>
  );
}
