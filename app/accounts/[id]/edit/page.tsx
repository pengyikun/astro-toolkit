import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import { getAllRegions } from '@/lib/region-schemas';
import AccountForm from '@/components/accounts/AccountForm';
import type { AccountWithFields } from '@/types';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

interface EditAccountPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditAccountPageProps): Promise<Metadata> {
  const { id } = await params;
  const account = await AccountModel.findById(db, Number(id));
  return { title: account ? `Edit ${account.name}` : 'Account Not Found' };
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const { id } = await params;
  const account = await AccountModel.findById(db, Number(id));

  if (!account) {
    notFound();
  }

  const regions = getAllRegions();

  const genericFieldMap: Record<string, string> = {};
  if (account.fields) {
    account.fields.forEach((f) => {
      if (f.field_key.startsWith('generic_') || f.field_key === 'transfer_type') {
        genericFieldMap[f.field_key] = f.field_value;
      }
    });
  }

  return (
    <>
      <section className="page-header">
        <div className="page-breadcrumbs">
          <a href="/accounts" className="font-medium hover:text-ink">Accounts</a>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>Edit</span>
        </div>
      </section>

      <AccountForm regions={regions} account={account} genericFieldValues={genericFieldMap} />
    </>
  );
}
