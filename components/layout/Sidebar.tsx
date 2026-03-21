'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n/client';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

function DashboardIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
    </svg>
  );
}

function AccountsIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function TransactionsIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.732-3.558" />
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </svg>
  );
}

function XmlIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.6" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0 1 15 0m-15 0a7.5 7.5 0 0 0 15 0m-15 0H3m16.5 0H21m-9-9v1.5m0 15V21m6.364-14.864-1.06 1.06M6.697 17.803l-1.06 1.06m0-12.727 1.06 1.06m10.607 10.607 1.06 1.06" />
    </svg>
  );
}

function NavLink({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const isActive =
    (item.path === '/' && currentPath === '/') ||
    (item.path !== '/' && currentPath.startsWith(item.path));

  return (
    <Link
      href={item.path}
      className={`ops-sidebar-link ${isActive ? 'ops-sidebar-link-active' : ''}`}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="min-w-0 block">{item.label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const mainItems: NavItem[] = [
    { path: '/', label: t('nav.dashboard'), icon: <DashboardIcon /> },
    { path: '/accounts', label: t('nav.accounts'), icon: <AccountsIcon /> },
    { path: '/vault', label: t('nav.vault'), icon: <VaultIcon /> },
    { path: '/penny-log', label: t('nav.transactions'), icon: <TransactionsIcon /> },
  ];

  const toolItems: NavItem[] = [
    { path: '/iban', label: t('nav.ibanChecker'), icon: <SearchIcon /> },
    { path: '/bic', label: t('nav.bicChecker'), icon: <GlobeIcon /> },
    { path: '/json-parser', label: t('nav.jsonParser'), icon: <CodeIcon /> },
    { path: '/xml-parser', label: t('nav.xmlParser'), icon: <XmlIcon /> },
  ];

  return (
    <aside
      id="sidebar"
      className="ops-sidebar fixed top-0 left-0 h-full w-72 flex flex-col z-40 -translate-x-full lg:translate-x-0 transition-transform duration-200"
    >
      <div className="px-6 pt-6 pb-5 border-b border-border">
        <div className="app-brand-lockup">
          <Image src="/images/fin-tech-tool-kit-logo.png" alt="Astro Toolkit logo" className="app-brand-logo" width={40} height={40} priority />
          <p className="app-title-mark text-ink">Astro Toolkit</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-5 overflow-y-auto">
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavLink key={item.path} item={item} currentPath={pathname} />
          ))}
        </div>

        <div className="mt-8">
          <div className="ops-sidebar-caption mb-3 px-1">{t('nav.validation')}</div>
          <div className="space-y-1">
            {toolItems.map((item) => (
              <NavLink key={item.path} item={item} currentPath={pathname} />
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
        >
          <SettingsIcon />
          <span>{t('nav.settings')}</span>
        </Link>
      </div>
    </aside>
  );
}
