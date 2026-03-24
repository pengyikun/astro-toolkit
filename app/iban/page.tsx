import type { Metadata } from 'next';
import IbanChecker from '@/components/iban/IbanChecker';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'IBAN Checker' };

export default async function IbanPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.validation') },
          { label: t(dict, 'iban.checker') },
        ]}
        title={t(dict, 'iban.checker')}
      />

      <div className="section-stack">
        <IbanChecker />
      </div>
    </>
  );
}
