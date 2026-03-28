'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SavedSnippetsTable from './SavedSnippetsTable';
import type { SavedSnippet } from '@/types';

interface SavedSnippetsSectionProps {
  snippets: SavedSnippet[];
  hasFilters: boolean;
  snippetType: 'json' | 'xml';
}

export default function SavedSnippetsSection({ snippets, hasFilters, snippetType }: SavedSnippetsSectionProps) {
  const router = useRouter();

  const handleDelete = useCallback(async (id: number) => {
    const form = new FormData();
    form.set('id', String(id));
    form.set('snippet_type', snippetType);

    try {
      const { deleteSnippet } = await import('@/actions/snippets');
      await deleteSnippet(form);
    } catch {
      router.refresh();
    }
  }, [snippetType, router]);

  return (
    <SavedSnippetsTable
      snippets={snippets}
      hasFilters={hasFilters}
      onDelete={handleDelete}
    />
  );
}
