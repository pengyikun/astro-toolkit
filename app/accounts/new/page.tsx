import type { Metadata } from 'next';
import { getAllRegions } from '@/lib/region-schemas';
import AccountForm from '@/components/accounts/AccountForm';

export const metadata: Metadata = { title: 'New Account' };

export default function NewAccountPage() {
  const regions = getAllRegions();

  return (
    <>
      <section className="page-header">
        <div className="page-breadcrumbs">
          <a href="/accounts" className="font-medium hover:text-ink">Accounts</a>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>New</span>
        </div>
      </section>

      <AccountForm regions={regions} />
    </>
  );
}
