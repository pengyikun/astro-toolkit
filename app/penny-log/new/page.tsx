import type { Metadata } from 'next';
import * as AccountModel from '@/models/account.model';
import db from '@/lib/db';
import LogForm from '@/components/penny-log/LogForm';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'New Transaction' };

export default async function NewPennyLogPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const accountsResult = await AccountModel.findAll(db, { status: 'active', perPage: 1000 });

  return (
    <div className="max-w-4xl">
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.transactions'), href: '/penny-log' },
          { label: t(dict, 'transactions.newTransaction') },
        ]}
        title={t(dict, 'transactions.newTransaction')}
      />

      <LogForm accounts={accountsResult.data} />
    </div>
  );
}
