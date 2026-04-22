'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterActions, FilterField, FilterPanel } from '@/components/ui/filter-panel';
import { useLocale } from '@/lib/i18n/client';

const STATUSES = ['pending', 'success', 'failed', 'timeout', 'returned'] as const;

interface LogFiltersProps {
  initialFilters: {
    status?: string;
    direction?: string;
    partner_name?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  };
}

export default function LogFilters({ initialFilters }: LogFiltersProps) {
  const { t } = useLocale();
  const router = useRouter();

  const [status, setStatus] = useState(initialFilters.status || '');
  const [direction, setDirection] = useState(initialFilters.direction || '');
  const [partnerName, setPartnerName] = useState(initialFilters.partner_name || '');
  const [dateFrom, setDateFrom] = useState(initialFilters.date_from || '');
  const [dateTo, setDateTo] = useState(initialFilters.date_to || '');
  const [search, setSearch] = useState(initialFilters.search || '');

  const hasFilters = !!(status || direction || partnerName || dateFrom || dateTo || search);

  const handleApply = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (direction) params.set('direction', direction);
    if (partnerName) params.set('partner_name', partnerName);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    if (search) params.set('search', search);
    const qs = params.toString();
    router.push(qs ? `/transactions?${qs}` : '/transactions');
  }, [status, direction, partnerName, dateFrom, dateTo, search, router]);

  const handleReset = useCallback(() => {
    setStatus('');
    setDirection('');
    setPartnerName('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    router.push('/transactions');
  }, [router]);

  return (
    <FilterPanel
      hasFilters={hasFilters}
      onReset={handleReset}
      resetLabel={t('accounts.resetFilters')}
      gridClassName="md:grid-cols-2 lg:grid-cols-3"
    >
      <FilterField label={t('common.status')} htmlFor="log-status">
        <Select value={status} onValueChange={(v) => setStatus(v === '__all' ? '' : v)}>
          <SelectTrigger id="log-status">
            <SelectValue placeholder={t('transactions.allStatuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t('transactions.allStatuses')}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{t(`transactions.${s}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label={t('common.direction')} htmlFor="log-direction">
        <Select value={direction} onValueChange={(v) => setDirection(v === '__all' ? '' : v)}>
          <SelectTrigger id="log-direction">
            <SelectValue placeholder={t('transactions.inboundAndOutbound')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">{t('transactions.inboundAndOutbound')}</SelectItem>
            <SelectItem value="inbound">{t('transactions.inbound')}</SelectItem>
            <SelectItem value="outbound">{t('transactions.outbound')}</SelectItem>
          </SelectContent>
        </Select>
      </FilterField>
      <FilterField label={t('common.partner')} htmlFor="log-partner">
        <Input
          type="text"
          id="log-partner"
          value={partnerName}
          onChange={(e) => setPartnerName(e.target.value)}
          placeholder={t('transactions.partnerName')}
        />
      </FilterField>
      <FilterField label={t('transactions.from')} htmlFor="log-from">
        <Input type="date" id="log-from" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      </FilterField>
      <FilterField label={t('transactions.to')} htmlFor="log-to">
        <Input type="date" id="log-to" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </FilterField>
      <FilterField label={t('common.search')} htmlFor="log-search">
        <Input
          type="text"
          id="log-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('transactions.searchPlaceholder')}
        />
      </FilterField>
      <FilterActions className="lg:col-span-3">
        <Button variant="outline" onClick={handleApply}>{t('accounts.applyFilters')}</Button>
        {hasFilters && (
          <Button variant="ghost" onClick={handleReset}>{t('common.clear')}</Button>
        )}
      </FilterActions>
    </FilterPanel>
  );
}
