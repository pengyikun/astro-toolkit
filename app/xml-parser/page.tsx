import type { Metadata } from 'next';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

const XmlParser = dynamic(() => import('@/components/parsers/XmlParser'), {
  loading: () => <div className="mt-8 text-ink-muted text-sm">Loading parser…</div>,
});

export const metadata: Metadata = { title: 'XML Parser' };

export default async function XmlParserPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  return (
    <>
      <Script src="/js/json-visualizer.js" strategy="lazyOnload" />
      <Script src="/js/xml-visualizer.js" strategy="lazyOnload" />

      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.validation') },
          { label: t(dict, 'parser.xml') },
        ]}
        title={t(dict, 'parser.xml')}
      />

      <XmlParser />
    </>
  );
}
