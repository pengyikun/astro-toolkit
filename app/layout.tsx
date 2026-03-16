import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import SidebarToggle from '@/components/layout/SidebarToggle';
import FlashMessages from '@/components/ui/FlashMessage';
import ConfirmModal from '@/components/ui/ConfirmModal';

export const metadata: Metadata = {
  title: {
    template: '%s — FinTech PM Toolkit',
    default: 'FinTech PM Toolkit',
  },
  description: 'Internal fintech PM toolkit for cross-border payment integration management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-ink h-screen overflow-hidden flex bg-page">
        <SidebarToggle />
        <Sidebar />
        <main className="flex-1 lg:ml-72 h-screen flex flex-col">
          <Header />
          <FlashMessages />
          <div className="flex-1 overflow-y-auto scroll-area">
            <div className="px-4 lg:px-8 py-6 lg:py-8">
              {children}
            </div>
          </div>
        </main>
        <ConfirmModal />
      </body>
    </html>
  );
}
