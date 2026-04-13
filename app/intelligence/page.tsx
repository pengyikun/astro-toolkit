import type { Metadata } from 'next';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';
import { getIdentityEntries } from '@/actions/intelligence';
import IdentityManager from '@/components/intelligence/IdentityManager';

export const metadata: Metadata = { title: 'Identity' };

export default async function IntelligenceIdentityPage() {
  await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const { entries } = await getIdentityEntries();

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'intelligence.title'), href: '/intelligence' },
          { label: t(dict, 'intelligence.identity') },
        ]}
        title={t(dict, 'intelligence.identity')}
        description={t(dict, 'intelligence.identityPageDescription')}
      />

      <IdentityManager initialEntries={entries} />
    </>
  );
}
