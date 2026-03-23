'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n/client';
import { useEffect, useState } from 'react';
import {
  LayoutGrid,
  CreditCard,
  Lock,
  FileText,
  Search,
  Globe,
  Code,
  FileCode,
  Settings,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const iconProps = { className: 'w-[18px] h-[18px]', strokeWidth: 1.6 } as const;
const SIDEBAR_TOGGLE_EVENT = 'astro-toolkit:sidebar-toggle';
const SIDEBAR_STATE_EVENT = 'astro-toolkit:sidebar-state';

function NavLink({
  item,
  currentPath,
  onNavigate,
}: {
  item: NavItem;
  currentPath: string;
  onNavigate?: () => void;
}) {
  const isActive =
    (item.path === '/' && currentPath === '/') ||
    (item.path !== '/' && currentPath.startsWith(item.path));

  return (
    <Link
      href={item.path}
      className={`ops-sidebar-link ${isActive ? 'ops-sidebar-link-active' : ''}`}
      onClick={onNavigate}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="min-w-0 block">{item.label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    function handleSidebarToggle() {
      setIsMobileOpen((current) => !current);
    }

    window.addEventListener(SIDEBAR_TOGGLE_EVENT, handleSidebarToggle);
    return () => {
      window.removeEventListener(SIDEBAR_TOGGLE_EVENT, handleSidebarToggle);
    };
  }, []);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(SIDEBAR_STATE_EVENT, {
        detail: { open: isMobileOpen },
      }),
    );
  }, [isMobileOpen]);

  const mainItems: NavItem[] = [
    { path: '/', label: t('nav.dashboard'), icon: <LayoutGrid {...iconProps} /> },
    { path: '/accounts', label: t('nav.accounts'), icon: <CreditCard {...iconProps} /> },
    { path: '/vault', label: t('nav.vault'), icon: <Lock {...iconProps} /> },
    { path: '/penny-log', label: t('nav.transactions'), icon: <FileText {...iconProps} /> },
  ];

  const toolItems: NavItem[] = [
    { path: '/iban', label: t('nav.ibanChecker'), icon: <Search {...iconProps} /> },
    { path: '/bic', label: t('nav.bicChecker'), icon: <Globe {...iconProps} /> },
    { path: '/json-parser', label: t('nav.jsonParser'), icon: <Code {...iconProps} /> },
    { path: '/xml-parser', label: t('nav.xmlParser'), icon: <FileCode {...iconProps} /> },
  ];

  return (
    <>
      <aside
        className="ops-sidebar fixed top-0 left-0 hidden h-full w-72 flex-col z-40 lg:flex"
      >
        <SidebarPanel
          pathname={pathname}
          mainItems={mainItems}
          toolItems={toolItems}
        />
      </aside>

      <MobileSidebar
        isOpen={isMobileOpen}
        onOpenChange={setIsMobileOpen}
        pathname={pathname}
        mainItems={mainItems}
        toolItems={toolItems}
        toggleLabel={t('ui.toggleNavigation')}
        closeLabel={t('common.close')}
      />
    </>
  );
}

function SidebarPanel({
  pathname,
  mainItems,
  toolItems,
  onNavigate,
}: {
  pathname: string;
  mainItems: NavItem[];
  toolItems: NavItem[];
  onNavigate?: () => void;
}) {
  const { t } = useLocale();

  return (
    <>
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <div className="app-brand-lockup">
          <Image src="/images/fin-tech-tool-kit-logo.png" alt="Astro Toolkit logo" className="app-brand-logo" width={40} height={40} priority />
          <p className="app-title-mark text-ink">Astro Toolkit</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-5 overflow-y-auto">
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavLink key={item.path} item={item} currentPath={pathname} onNavigate={onNavigate} />
          ))}
        </div>

        <div className="mt-8">
          <div className="ops-sidebar-caption mb-3 px-1">{t('nav.validation')}</div>
          <div className="space-y-1">
            {toolItems.map((item) => (
              <NavLink key={item.path} item={item} currentPath={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </nav>

      <div className="px-4 pb-5 pt-3 border-t border-border">
        <Link
          href="/data"
          className={`ops-sidebar-footer-link ${
            pathname.startsWith('/settings') || pathname.startsWith('/data')
              ? 'ops-sidebar-footer-link-active'
              : ''
          }`}
          onClick={onNavigate}
        >
          <Settings {...iconProps} strokeWidth={1.7} />
          <span>{t('nav.settings')}</span>
        </Link>
      </div>
    </>
  );
}

function MobileSidebar({
  isOpen,
  onOpenChange,
  pathname,
  mainItems,
  toolItems,
  toggleLabel,
  closeLabel,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  mainItems: NavItem[];
  toolItems: NavItem[];
  toggleLabel: string;
  closeLabel: string;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        id="mobile-sidebar"
        side="left"
        closeLabel={closeLabel}
        className="ops-sidebar w-[18rem] max-w-[18rem] border-r p-0 sm:max-w-[18rem] lg:hidden"
      >
        <SheetTitle className="sr-only">Astro Toolkit</SheetTitle>
        <SheetDescription className="sr-only">{toggleLabel}</SheetDescription>
        <SidebarPanel
          pathname={pathname}
          mainItems={mainItems}
          toolItems={toolItems}
          onNavigate={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
