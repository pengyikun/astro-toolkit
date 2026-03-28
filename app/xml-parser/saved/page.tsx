import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import db from '@/lib/db';
import * as SnippetModel from '@/models/snippet.model';
import SnippetFilters from '@/components/parsers/SnippetFilters';
import SavedSnippetsSection from '@/components/parsers/SavedSnippetsSection';
import Pagination from '@/components/ui/Pagination';

export const metadata: Metadata = { title: 'Saved XML Snippets' };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function SavedXmlSnippetsPage({ searchParams }: PageProps) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const params = await searchParams;

  const filters = {
    snippet_type: 'xml' as const,
    search: params.search || undefined,
    page: params.page || '1',
  };

  const result = await SnippetModel.findAll(db, filters);
  const hasFilters = !!params.search;

  const filterParams: Record<string, string> = {};
  if (params.search) filterParams.search = params.search;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.validation') },
          { label: t(dict, 'parser.xml'), href: '/xml-parser' },
          { label: t(dict, 'parser.savedSnippets') },
        ]}
        title={t(dict, 'parser.savedSnippets')}
        actions={
          <Button asChild variant="outline">
            <Link href="/xml-parser">{t(dict, 'common.back')}</Link>
          </Button>
        }
      />

      <SnippetFilters basePath="/xml-parser/saved" initialSearch={params.search} />

      <SavedSnippetsSection
        snippets={result.data}
        hasFilters={hasFilters}
        snippetType="xml"
      />

      {result.totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            basePath="/xml-parser/saved"
            filters={filterParams}
          />
        </div>
      )}
    </>
  );
}
