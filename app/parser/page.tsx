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

const XmlParser = dynamic(() => import('@/components/parsers/XmlParser'), {
  loading: () => <div className="mt-8 text-ink-muted text-sm">Loading parser…</div>,
});

export const metadata: Metadata = { title: 'Parser' };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ParserPage({ searchParams }: PageProps) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const params = await searchParams;
  const format = params.format === 'xml' ? 'xml' : 'json';
  const isXml = format === 'xml';

  return (
    <>
      <Script src="/js/json-visualizer.js" strategy="lazyOnload" />
      {isXml && <Script src="/js/xml-visualizer.js" strategy="lazyOnload" />}

      <PageHeader
        title={isXml ? t(dict, 'parser.xml') : t(dict, 'parser.json')}
        actions={
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border" role="group">
              <Link
                href="/parser?format=json"
                className={`px-3 py-1.5 text-sm font-medium rounded-l-md transition-colors ${!isXml ? 'bg-surface-active text-ink' : 'text-ink-secondary hover:text-ink'}`}
              >
                JSON
              </Link>
              <Link
                href="/parser?format=xml"
                className={`px-3 py-1.5 text-sm font-medium rounded-r-md border-l border-border transition-colors ${isXml ? 'bg-surface-active text-ink' : 'text-ink-secondary hover:text-ink'}`}
              >
                XML
              </Link>
            </div>
            <Button asChild variant="outline">
              <Link href={isXml ? '/xml-parser/saved' : '/json-parser/saved'}>{t(dict, 'parser.savedSnippets')}</Link>
            </Button>
          </div>
        }
      />

      {isXml ? <XmlParser /> : <JsonParser />}
    </>
  );
}
