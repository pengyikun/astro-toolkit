import type { Metadata } from 'next';
import BicChecker from '@/components/bic/BicChecker';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'BIC/SWIFT Checker' };

export default async function BicPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.validation') },
          { label: t(dict, 'bic.checker') },
        ]}
        title={t(dict, 'bic.checker')}
      />

      <div className="section-stack">
        <BicChecker />
      </div>
    </>
  );
}
