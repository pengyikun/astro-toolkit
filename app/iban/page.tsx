import type { Metadata } from 'next';
import IbanChecker from '@/components/iban/IbanChecker';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'IBAN Checker' };

export default async function IbanPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>{t(dict, 'common.validation')}</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>{t(dict, 'iban.checker')}</span>
        </div>
        <div>
          <h1 className="console-title">{t(dict, 'iban.checker')}</h1>
        </div>
      </section>

      <div className="section-stack">
        <IbanChecker />
      </div>
    </>
  );
}
