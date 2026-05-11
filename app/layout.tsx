import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import SidebarToggle from '@/components/layout/SidebarToggle';
import MainContent from '@/components/layout/MainContent';
import { SidebarProvider } from '@/components/layout/SidebarContext';
import { Toaster } from '@/components/ui/sonner';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { getLocaleFromCookies, getDictionary } from '@/lib/i18n';
import { LocaleProvider } from '@/lib/i18n/client';

export const metadata: Metadata = {
  title: {
    template: '%s — Astro Toolkit',
    default: 'Astro Toolkit',
  },
  description: 'Self-hosted workspace for payment operations and integration testing',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const isAuthShell = requestHeaders.get('x-astro-shell') === 'auth';

  return (
    <html lang={locale}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="text-ink min-h-dvh bg-page">
        <LocaleProvider locale={locale} dict={dict}>
          <Toaster />
          {isAuthShell ? (
            children
          ) : (
            <SidebarProvider>
              <div className="min-h-dvh lg:flex">
                <SidebarToggle />
                <Sidebar />
                <MainContent>
                  <Header />
                  <div className="flex-1 scroll-area">
                    <div className="px-4 pb-8 pt-6 md:px-6 lg:px-8 lg:py-8">
                      {children}
                    </div>
                  </div>
                </MainContent>
              </div>
            </SidebarProvider>
          )}
          <ConfirmModal />
        </LocaleProvider>
      </body>
    </html>
  );
}
