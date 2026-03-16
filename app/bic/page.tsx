import type { Metadata } from 'next';
import BicChecker from '@/components/bic/BicChecker';

export const metadata: Metadata = { title: 'BIC/SWIFT Checker' };

export default function BicPage() {
  return (
    <>
      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>Validation</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>BIC checker</span>
        </div>
        <div>
          <h1 className="console-title">BIC checker</h1>
        </div>
      </section>

      <div className="section-stack">
        <BicChecker />
      </div>
    </>
  );
}
