import type { Metadata } from 'next';
import ExportImport from '@/components/data/ExportImport';

export const metadata: Metadata = { title: 'Settings' };

export default function DataPage() {
  return (
    <>
      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>Workspace</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>Settings</span>
        </div>
        <div>
          <h1 className="console-title">Settings</h1>
        </div>
      </section>

      <div className="section-stack">
        <ExportImport />
      </div>
    </>
  );
}
