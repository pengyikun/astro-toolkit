'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from '@/lib/i18n/client';
import { isNavPathActive } from '@/lib/navigation';
import {
  ArrowLeft,
  Globe,
  Cable,
  Sparkles,
  Database,
} from 'lucide-react';

const iconProps = { className: 'w-[18px] h-[18px]', strokeWidth: 1.6 } as const;

interface SettingsNavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export default function SettingsSidebar() {
  const pathname = usePathname();
  const { t } = useLocale();

  const items: SettingsNavItem[] = [
    { path: '/settings', label: t('settings.general'), icon: <Globe {...iconProps} /> },
    { path: '/settings/connectors', label: t('settings.connectorsPage'), icon: <Cable {...iconProps} /> },
    { path: '/settings/ai', label: t('settings.aiPage'), icon: <Sparkles {...iconProps} /> },
    { path: '/settings/data', label: t('settings.dataPage'), icon: <Database {...iconProps} /> },
  ];

  return (
    <aside className="ops-sidebar fixed top-0 left-0 hidden h-full flex-col z-40 lg:flex w-60">
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <Link
          href="/"
          className="ops-sidebar-link gap-3"
        >
          <ArrowLeft {...iconProps} />
          <span className="min-w-0 block">{t('settings.backToApp')}</span>
        </Link>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto px-3">
        <div className="px-3 mb-3">
          <span className="ops-sidebar-caption">{t('nav.settings')}</span>
        </div>
        <div className="space-y-0.5">
          {items.map((item) => {
            const isActive = item.path === '/settings'
              ? pathname === '/settings'
              : isNavPathActive(item.path, pathname);

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`ops-sidebar-link ${isActive ? 'ops-sidebar-link-active' : ''}`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="min-w-0 block">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </aside>
  );
}
