import type { Metadata } from 'next';
import Script from 'next/script';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
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

      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.validation') },
          { label: t(dict, 'parser.json') },
        ]}
        title={t(dict, 'parser.json')}
        actions={
          <Button asChild variant="outline">
            <Link href="/json-parser/saved">{t(dict, 'parser.savedSnippets')}</Link>
          </Button>
        }
      />

      <JsonParser />
    </>
  );
}
