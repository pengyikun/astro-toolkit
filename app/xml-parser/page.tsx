import type { Metadata } from 'next';
import Script from 'next/script';
import XmlParser from '@/components/parsers/XmlParser';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'XML Parser' };

export default async function XmlParserPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <Script src="/js/json-visualizer.js" strategy="lazyOnload" />
      <Script src="/js/xml-visualizer.js" strategy="lazyOnload" />

      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>{t(dict, 'common.validation')}</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>{t(dict, 'parser.xml')}</span>
        </div>
        <div>
          <h1 className="console-title">{t(dict, 'parser.xml')}</h1>
        </div>
      </section>

      <XmlParser />
    </>
  );
}
