import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import SidebarToggle from '@/components/layout/SidebarToggle';
import FlashMessages from '@/components/ui/FlashMessage';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getLocaleFromCookies, getDictionary } from '@/lib/i18n';
import { LocaleProvider } from '@/lib/i18n/client';

export const metadata: Metadata = {
  title: {
    template: '%s — Astro Toolkit',
    default: 'Astro Toolkit',
  },
  description: 'Internal toolkit for cross-border payment integration management',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="text-ink h-screen overflow-hidden flex bg-page">
        <LocaleProvider locale={locale} dict={dict}>
          <SidebarToggle />
          <Sidebar />
          <main className="flex-1 lg:ml-72 h-screen flex flex-col">
            <Header />
            <FlashMessages />
            <div className="flex-1 overflow-y-auto scroll-area">
              <div className="px-4 md:px-6 lg:px-8 py-6 lg:py-8">
                {children}
              </div>
            </div>
          </main>
          <ConfirmModal />
        </LocaleProvider>
      </body>
    </html>
  );
}
