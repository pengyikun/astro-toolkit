import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import { getAllRegions } from '@/lib/region-schemas';
import AccountForm from '@/components/accounts/AccountForm';
import { PageHeader } from '@/components/ui/page-header';
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

  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.accounts'), href: '/accounts' },
          { label: account.name, href: `/accounts/${account.id}` },
          { label: t(dict, 'common.edit') },
        ]}
        title={t(dict, 'accounts.editAccount')}
      />

      <AccountForm regions={regions} account={account} genericFieldValues={genericFieldMap} />
    </>
  );
}
