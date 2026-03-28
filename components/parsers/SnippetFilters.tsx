'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterActions, FilterField, FilterPanel } from '@/components/ui/filter-panel';
import { useLocale } from '@/lib/i18n/client';

interface SnippetFiltersProps {
  basePath: string;
  initialSearch?: string;
}

export default function SnippetFilters({ basePath, initialSearch }: SnippetFiltersProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch || '');

  const hasFilters = !!search;

  const handleApply = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }, [search, basePath, router]);

  const handleReset = useCallback(() => {
    setSearch('');
    router.push(basePath);
  }, [basePath, router]);

  return (
    <FilterPanel
      hasFilters={hasFilters}
      onReset={handleReset}
      resetLabel={t('accounts.resetFilters')}
      gridClassName="md:grid-cols-2 lg:grid-cols-3"
    >
      <FilterField label={t('common.search')} htmlFor="filter-snippet-search">
        <Input
          id="filter-snippet-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('parser.searchSnippets')}
          onKeyDown={(e) => { if (e.key === 'Enter') handleApply(); }}
        />
      </FilterField>
      <FilterActions>
        <Button variant="outline" className="w-full lg:w-auto" onClick={handleApply}>
          {t('common.apply')}
        </Button>
      </FilterActions>
    </FilterPanel>
  );
}
