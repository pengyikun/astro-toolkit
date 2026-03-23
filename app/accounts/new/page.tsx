import type { Metadata } from 'next';
import { getAllRegions } from '@/lib/region-schemas';
import AccountForm from '@/components/accounts/AccountForm';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'New Account' };

export default async function NewAccountPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const regions = getAllRegions();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.accounts'), href: '/accounts' },
          { label: t(dict, 'accounts.newAccount') },
        ]}
        title={t(dict, 'accounts.newAccount')}
      />

      <AccountForm regions={regions} />
    </>
  );
}
