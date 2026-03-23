'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterActions, FilterField, FilterPanel } from '@/components/ui/filter-panel';
import { useLocale } from '@/lib/i18n/client';

interface VaultFiltersProps {
  partners: string[];
  initialFilters: {
    partner_name?: string;
    environment?: string;
    search?: string;
  };
}

export default function VaultFilters({ partners, initialFilters }: VaultFiltersProps) {
  const { t } = useLocale();
  const router = useRouter();

  const [partnerName, setPartnerName] = useState(initialFilters.partner_name || '');
  const [environment, setEnvironment] = useState(initialFilters.environment || '');
  const [search, setSearch] = useState(initialFilters.search || '');

  const hasFilters = !!(partnerName || environment || search);

  const handleApply = useCallback(() => {
    const params = new URLSearchParams();
    if (partnerName) params.set('partner_name', partnerName);
    if (environment) params.set('environment', environment);
    if (search) params.set('search', search);
    const qs = params.toString();
    router.push(qs ? `/vault?${qs}` : '/vault');
  }, [partnerName, environment, search, router]);

  const handleReset = useCallback(() => {
    setPartnerName('');
    setEnvironment('');
    setSearch('');
    router.push('/vault');
  }, [router]);

  return (
    <FilterPanel
      hasFilters={hasFilters}
      onReset={handleReset}
      resetLabel={t('accounts.resetFilters')}
      gridClassName="md:grid-cols-2 lg:grid-cols-4"
    >
      <FilterField label={t('common.partner')} htmlFor="vault-partner">
        <Select value={partnerName} onValueChange={(v) => setPartnerName(v === '__all' ? '' : v)}>
          <SelectTrigger id="vault-partner">
            <SelectValue placeholder={t('vault.allPartners')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t('vault.allPartners')}</SelectItem>
            {partners.map((partner) => (
              <SelectItem key={partner} value={partner}>{partner}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label={t('common.environment')} htmlFor="vault-environment">
        <Select value={environment} onValueChange={(v) => setEnvironment(v === '__all' ? '' : v)}>
          <SelectTrigger id="vault-environment">
            <SelectValue placeholder={t('vault.allEnvironments')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t('vault.allEnvironments')}</SelectItem>
            <SelectItem value="sandbox">{t('vault.sandbox')}</SelectItem>
            <SelectItem value="staging">{t('vault.staging')}</SelectItem>
            <SelectItem value="uat">{t('vault.uat')}</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label={t('common.search')} htmlFor="vault-search">
        <Input
          type="text"
          id="vault-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search.placeholder')}
        />
      </FilterField>
      <FilterActions>
        <Button variant="outline" className="w-full lg:w-auto" onClick={handleApply}>{t('accounts.applyFilters')}</Button>
      </FilterActions>
    </FilterPanel>
  );
}
