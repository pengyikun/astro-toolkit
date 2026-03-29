import type { Metadata } from 'next';
import Script from 'next/script';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { DetailSectionCard, DetailMetadata, DetailItem } from '@/components/ui/detail-card';
import { TrashIcon } from '@/components/ui/Icons';
import { formatDate, getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import db from '@/lib/db';
import * as SnippetModel from '@/models/snippet.model';
import { deleteSnippet } from '@/actions/snippets';
import SnippetJsonDetailView from '@/components/parsers/SnippetJsonDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const snippet = await SnippetModel.findById(db, Number(id));
  return { title: snippet ? snippet.title : `Snippet #${id}` };
}

export default async function JsonSnippetDetailPage({ params }: PageProps) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const { id } = await params;
  const snippet = await SnippetModel.findById(db, Number(id));
  if (!snippet || snippet.snippet_type !== 'json') notFound();

  let parseData = null;
  try {
    parseData = JSON.parse(snippet.parse_result);
  } catch {
    // parse_result is invalid — show raw content only
  }

  return (
    <>
      <Script src="/js/json-visualizer.js" strategy="lazyOnload" />

      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.validation') },
          { label: t(dict, 'parser.json'), href: '/json-parser' },
          { label: t(dict, 'parser.savedSnippets'), href: '/json-parser/saved' },
          { label: snippet.title },
        ]}
        title={snippet.title}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/json-parser/saved">{t(dict, 'common.back')}</Link>
            </Button>
            <form action={deleteSnippet}>
              <input type="hidden" name="id" value={snippet.id} />
              <input type="hidden" name="snippet_type" value="json" />
              <Button type="submit" variant="destructive">
                <TrashIcon className="w-3.5 h-3.5" />
                {t(dict, 'common.delete')}
              </Button>
            </form>
          </>
        }
      />

      <DetailSectionCard className="mb-5" title={t(dict, 'parser.snippetTitle')}>
        <DetailMetadata>
          <DetailItem label={t(dict, 'parser.snippetTitle')} value={snippet.title} />
          <DetailItem label={t(dict, 'common.type')} value="JSON" valueClassName="font-mono" />
          <DetailItem label={t(dict, 'common.created')} value={formatDate(locale, snippet.created_at, { dateStyle: 'medium', timeStyle: 'short' })} />
          {snippet.notes && (
            <DetailItem label={t(dict, 'parser.snippetNotes')} value={snippet.notes} wide />
          )}
        </DetailMetadata>
      </DetailSectionCard>

      {parseData ? (
        <SnippetJsonDetailView content={snippet.content} parseData={parseData} snippetId={snippet.id} />
      ) : (
        <DetailSectionCard title={t(dict, 'parser.jsonInput')}>
          <pre className="whitespace-pre-wrap break-all text-sm font-mono text-ink-secondary">{snippet.content}</pre>
        </DetailSectionCard>
      )}
    </>
  );
}
