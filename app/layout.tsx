import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import SidebarToggle from '@/components/layout/SidebarToggle';
import { Toaster } from '@/components/ui/sonner';
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
      <body className="text-ink min-h-dvh bg-page">
        <LocaleProvider locale={locale} dict={dict}>
          <div className="min-h-dvh lg:flex">
            <SidebarToggle />
            <Sidebar />
            <main className="min-h-dvh min-w-0 flex-1 flex flex-col lg:ml-72">
              <Header />
              <Toaster />
              <div className="flex-1 scroll-area">
                <div className="px-4 pb-8 pt-6 md:px-6 lg:px-8 lg:py-8">
                  {children}
                </div>
              </div>
            </main>
          </div>
          <ConfirmModal />
        </LocaleProvider>
      </body>
    </html>
  );
}
