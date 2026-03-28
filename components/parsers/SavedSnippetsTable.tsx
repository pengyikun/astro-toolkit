'use client';

import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { SavedSnippet } from '@/types';

interface SavedSnippetsTableProps {
  snippets: SavedSnippet[];
  hasFilters: boolean;
  onDelete: (id: number) => void;
}

export default function SavedSnippetsTable({
  snippets,
  hasFilters,
  onDelete,
}: SavedSnippetsTableProps) {
  const { t, formatDate } = useLocale();

  if (snippets.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="px-4 py-12 text-center text-sm text-muted-foreground">
          {hasFilters ? t('parser.noSavedSnippetsFiltered') : t('parser.noSavedSnippets')}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6 overflow-hidden">
      <Table responsive>
        <TableHeader>
          <TableRow>
            <TableHead>{t('parser.snippetTitle')}</TableHead>
            <TableHead>{t('parser.snippetNotes')}</TableHead>
            <TableHead>{t('common.created')}</TableHead>
            <TableHead className="text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {snippets.map((snippet) => {
            const detailPath = snippet.snippet_type === 'json'
              ? `/json-parser/saved/${snippet.id}`
              : `/xml-parser/saved/${snippet.id}`;

            return (
              <TableRow key={snippet.id}>
                <TableCell data-label={t('parser.snippetTitle')}>
                  <Link href={detailPath} className="table-primary-link hover:text-brand" dir="auto">
                    {snippet.title}
                  </Link>
                </TableCell>
                <TableCell data-label={t('parser.snippetNotes')}>
                  <span className="text-sm text-ink-secondary" dir="auto">
                    {snippet.notes || '—'}
                  </span>
                </TableCell>
                <TableCell data-label={t('common.created')}>
                  {formatDate(snippet.created_at, { dateStyle: 'medium' })}
                </TableCell>
                <TableCell data-label={t('common.actions')} data-cell-actions="true" className="text-right">
                  <div className="table-actions justify-end">
                    <Button asChild size="sm" variant="outline">
                      <Link href={detailPath}>{t('common.view')}</Link>
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDelete(snippet.id)}>
                      {t('parser.deleteSnippet')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
