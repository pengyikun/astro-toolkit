'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n/client';
import { isNavPathActive, type NavMatchMode } from '@/lib/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutGrid,
  CreditCard,
  Lock,
  FileText,
  Database,
  Search,
  Globe,
  Code,
  FileCode,
  Mail,
  MessageCircle,
  Cable,
  UserCircle,
  Sparkles,
  ScrollText,
  ShieldCheck,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  matchMode?: NavMatchMode;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

const iconProps = { className: 'w-[18px] h-[18px]', strokeWidth: 1.6 } as const;
const SIDEBAR_TOGGLE_EVENT = 'astro-toolkit:sidebar-toggle';
const SIDEBAR_STATE_EVENT = 'astro-toolkit:sidebar-state';
const SIDEBAR_COLLAPSE_EVENT = 'astro-toolkit:sidebar-collapse';

function NavLink({
  item,
  currentPath,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  currentPath: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const isActive = isNavPathActive(item.path, currentPath, item.matchMode);

  const link = (
    <Link
      href={item.path}
      className={`ops-sidebar-link ${isActive ? 'ops-sidebar-link-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
      onClick={onNavigate}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="min-w-0 block">{item.label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>{item.label}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

function NavGroupSection({
  group,
  currentPath,
  collapsed,
  onNavigate,
}: {
  group: NavGroup;
  currentPath: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const hasActiveChild = group.items.some(
    (item) => isNavPathActive(item.path, currentPath, item.matchMode),
  );
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  if (collapsed) {
    return (
      <>
        {group.items.map((item) => (
          <NavLink key={item.path} item={item} currentPath={currentPath} collapsed onNavigate={onNavigate} />
        ))}
      </>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`ops-sidebar-link w-full justify-between ${hasActiveChild ? 'text-ink' : ''}`}
      >
        <span className="flex items-center gap-3">
          <span className="shrink-0">{group.icon}</span>
          <span className="min-w-0 block">{group.label}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink-secondary transition-transform duration-200 ${isOpen ? '' : '-rotate-90'}`}
        />
      </button>
      {isOpen && (
        <div className="ml-5 pl-3 border-l border-border space-y-0.5 mt-0.5">
          {group.items.map((item) => (
            <NavLink key={item.path} item={item} currentPath={currentPath} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(SIDEBAR_COLLAPSE_EVENT, {
        detail: { collapsed: isCollapsed },
      }),
    );
  }, [isCollapsed]);

  const topItems: NavItem[] = [
    { path: '/', label: t('nav.dashboard'), icon: <LayoutGrid {...iconProps} /> },
  ];

  const dataGroup: NavGroup = {
    label: t('nav.data'),
    icon: <Database {...iconProps} />,
    items: [
      { path: '/accounts', label: t('nav.accounts'), icon: <CreditCard {...iconProps} /> },
      { path: '/vault', label: t('nav.vault'), icon: <Lock {...iconProps} /> },
      { path: '/penny-log', label: t('nav.transactions'), icon: <FileText {...iconProps} /> },
    ],
  };

  const connectorGroup: NavGroup = {
    label: t('nav.connectors'),
    icon: <Cable {...iconProps} />,
    items: [
      { path: '/mail', label: t('nav.mail'), icon: <Mail {...iconProps} /> },
      { path: '/whatsapp', label: t('nav.whatsapp'), icon: <MessageCircle {...iconProps} /> },
    ],
  };

  const validationGroup: NavGroup = {
    label: t('nav.validation'),
    icon: <ShieldCheck {...iconProps} />,
    items: [
      { path: '/iban', label: t('nav.ibanChecker'), icon: <Search {...iconProps} /> },
      { path: '/bic', label: t('nav.bicChecker'), icon: <Globe {...iconProps} /> },
      { path: '/json-parser', label: t('nav.jsonParser'), icon: <Code {...iconProps} /> },
      { path: '/xml-parser', label: t('nav.xmlParser'), icon: <FileCode {...iconProps} /> },
    ],
  };

  const intelligenceGroup: NavGroup = {
    label: t('nav.intelligence'),
    icon: <Sparkles {...iconProps} />,
    items: [
      { path: '/intelligence', label: t('nav.identity'), icon: <UserCircle {...iconProps} />, matchMode: 'exact' },
      { path: '/intelligence/brief', label: t('nav.brief'), icon: <ScrollText {...iconProps} /> },
    ],
  };

  const groups = [dataGroup, connectorGroup, intelligenceGroup, validationGroup];

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        className={`ops-sidebar fixed top-0 left-0 hidden h-full flex-col z-40 lg:flex transition-[width] duration-200 ${isCollapsed ? 'w-[4.5rem]' : 'w-60'}`}
      >
        <SidebarPanel
          pathname={pathname}
          topItems={topItems}
          groups={groups}
          collapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        />
      </aside>

      <MobileSidebar
        isOpen={isMobileOpen}
        onOpenChange={setIsMobileOpen}
        pathname={pathname}
        topItems={topItems}
        groups={groups}
        toggleLabel={t('ui.toggleNavigation')}
        closeLabel={t('common.close')}
      />
    </TooltipProvider>
  );
}

function SidebarPanel({
  pathname,
  topItems,
  groups,
  collapsed,
  onNavigate,
  onToggleCollapse,
}: {
  pathname: string;
  topItems: NavItem[];
  groups: NavGroup[];
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <>
      <div className={`border-b border-border ${collapsed ? 'px-3 pt-5 pb-4' : 'px-5 pt-5 pb-4'}`}>
        <div className={`app-brand-lockup ${collapsed ? 'justify-center' : ''}`}>
          <Image src="/images/fin-tech-tool-kit-logo.png" alt="Astro Toolkit logo" className="app-brand-logo" width={32} height={32} priority />
          {!collapsed && <p className="app-title-mark text-ink">Astro Toolkit</p>}
        </div>
      </div>

      <nav className={`flex-1 py-4 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
        <div className="space-y-0.5">
          {topItems.map((item) => (
            <NavLink key={item.path} item={item} currentPath={pathname} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
        <div className={`my-3 border-t border-border ${collapsed ? 'mx-1' : 'mx-2'}`} />
        <div className="space-y-0.5">
          {groups.map((group) => (
            <NavGroupSection key={group.label} group={group} currentPath={pathname} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      </nav>

      {onToggleCollapse && (
        <div className={`pb-4 pt-2 border-t border-border ${collapsed ? 'px-2' : 'px-3'}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`ops-sidebar-link w-full ${collapsed ? 'justify-center px-0' : ''}`}
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-[18px] h-[18px]" strokeWidth={1.6} />
                ) : (
                  <PanelLeftClose className="w-[18px] h-[18px]" strokeWidth={1.6} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {collapsed ? 'Expand' : 'Collapse'}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </>
  );
}

function MobileSidebar({
  isOpen,
  onOpenChange,
  pathname,
  topItems,
  groups,
  toggleLabel,
  closeLabel,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  topItems: NavItem[];
  groups: NavGroup[];
  toggleLabel: string;
  closeLabel: string;
}) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        id="mobile-sidebar"
        side="left"
        closeLabel={closeLabel}
        className="ops-sidebar w-60 max-w-60 border-r p-0 sm:max-w-60 lg:hidden"
      >
        <SheetTitle className="sr-only">Astro Toolkit</SheetTitle>
        <SheetDescription className="sr-only">{toggleLabel}</SheetDescription>
        <SidebarPanel
          pathname={pathname}
          topItems={topItems}
          groups={groups}
          onNavigate={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
