import type { Metadata } from 'next';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

const JsonParser = dynamic(() => import('@/components/parsers/JsonParser'), {
  loading: () => <div className="mt-8 text-ink-muted text-sm">Loading parser…</div>,
});

export const metadata: Metadata = { title: 'JSON Parser' };

export default async function JsonParserPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <Script src="/js/json-visualizer.js" strategy="lazyOnload" />

      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>{t(dict, 'common.validation')}</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>{t(dict, 'parser.json')}</span>
        </div>
        <div>
          <h1 className="console-title">{t(dict, 'parser.json')}</h1>
        </div>
      </section>

      <JsonParser />
    </>
  );
}
