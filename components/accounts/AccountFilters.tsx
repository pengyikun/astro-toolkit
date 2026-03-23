'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FilterActions, FilterField, FilterPanel } from '@/components/ui/filter-panel';
import { useLocale } from '@/lib/i18n/client';

interface Region {
  code: string;
  name: string;
}

interface AccountFiltersProps {
  regions: Region[];
  initialFilters: {
    region_code?: string;
    status?: string;
    account_type?: string;
  };
}

export default function AccountFilters({ regions, initialFilters }: AccountFiltersProps) {
  const { t } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [regionCode, setRegionCode] = useState(initialFilters.region_code || '');
  const [status, setStatus] = useState(initialFilters.status || '');
  const [accountType, setAccountType] = useState(initialFilters.account_type || '');

  const hasFilters = !!(regionCode || status || accountType);

  const handleApply = useCallback(() => {
    const params = new URLSearchParams();
    if (regionCode) params.set('region_code', regionCode);
    if (status) params.set('status', status);
    if (accountType) params.set('account_type', accountType);
    // preserve search if present
    const currentSearch = searchParams.get('search');
    if (currentSearch) params.set('search', currentSearch);
    const qs = params.toString();
    router.push(qs ? `/accounts?${qs}` : '/accounts');
  }, [regionCode, status, accountType, searchParams, router]);

  const handleReset = useCallback(() => {
    setRegionCode('');
    setStatus('');
    setAccountType('');
    router.push('/accounts');
  }, [router]);

  return (
    <FilterPanel
      hasFilters={hasFilters}
      onReset={handleReset}
      resetLabel={t('accounts.resetFilters')}
      gridClassName="md:grid-cols-2 lg:grid-cols-4"
    >
      <FilterField label={t('common.region')} htmlFor="filter-region">
        <Select value={regionCode} onValueChange={(v) => setRegionCode(v === '__all' ? '' : v)}>
          <SelectTrigger id="filter-region">
            <SelectValue placeholder={t('accounts.allRegions')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t('accounts.allRegions')}</SelectItem>
            {regions.map((r) => (
              <SelectItem key={r.code} value={r.code}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label={t('common.status')} htmlFor="filter-status">
        <Select value={status} onValueChange={(v) => setStatus(v === '__all' ? '' : v)}>
          <SelectTrigger id="filter-status">
            <SelectValue placeholder={t('accounts.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t('accounts.allStatuses')}</SelectItem>
            <SelectItem value="active">{t('accounts.active')}</SelectItem>
            <SelectItem value="archived">{t('accounts.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label={t('accounts.accountType')} htmlFor="filter-type">
        <Select value={accountType} onValueChange={(v) => setAccountType(v === '__all' ? '' : v)}>
          <SelectTrigger id="filter-type">
            <SelectValue placeholder={t('accounts.mockAndReal')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t('accounts.mockAndReal')}</SelectItem>
            <SelectItem value="mock">{t('accounts.mock')}</SelectItem>
            <SelectItem value="real">{t('accounts.real')}</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>
      <FilterActions>
        <Button variant="outline" className="w-full lg:w-auto" onClick={handleApply}>{t('accounts.applyFilters')}</Button>
      </FilterActions>
    </FilterPanel>
  );
}
