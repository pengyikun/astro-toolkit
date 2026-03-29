import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import db from '@/lib/db';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import LogFilters from '@/components/penny-log/LogFilters';
import { deleteLog } from '@/actions/penny-log';
import type { PennyLogFilters } from '@/types';
import { formatDate, getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';

export const metadata: Metadata = { title: 'Penny Test Log' };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PennyLogListPage({ searchParams }: PageProps) {
  const scope = await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const params = await searchParams;

  const filters: PennyLogFilters = {
    status: params.status || undefined,
    direction: params.direction || undefined,
    partner_name: params.partner_name || undefined,
    currency: params.currency || undefined,
    date_from: params.date_from || undefined,
    date_to: params.date_to || undefined,
    search: params.search || undefined,
    page: params.page || '1',
  };

  const result = await PennyTestLogModel.findAll(db, filters, scope);

  const hasFilters = !!(
    params.status ||
    params.direction ||
    params.partner_name ||
    params.currency ||
    params.date_from ||
    params.date_to ||
    params.search
  );

  const filterParams: Record<string, string> = {};
  if (params.status) filterParams.status = params.status;
  if (params.direction) filterParams.direction = params.direction;
  if (params.partner_name) filterParams.partner_name = params.partner_name;
  if (params.currency) filterParams.currency = params.currency;
  if (params.date_from) filterParams.date_from = params.date_from;
  if (params.date_to) filterParams.date_to = params.date_to;
  if (params.search) filterParams.search = params.search;

  const emptyMessage = hasFilters
    ? t(dict, 'transactions.noTransactionsFiltered')
    : t(dict, 'transactions.noTransactionsYet');

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.transactions') },
          { label: t(dict, 'transactions.ledger') },
        ]}
        title={t(dict, 'transactions.transactionLedger')}
        actions={
          <Button asChild>
            <Link href="/penny-log/new">{t(dict, 'transactions.newTransaction')}</Link>
          </Button>
        }
      />

      <LogFilters
        initialFilters={{
          status: params.status,
          direction: params.direction,
          partner_name: params.partner_name,
          date_from: params.date_from,
          date_to: params.date_to,
          search: params.search,
        }}
      />

      {result.data.length > 0 ? (
        <>
          <Card className="mt-6 overflow-hidden">
            <Table responsive>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(dict, 'common.status')}</TableHead>
                  <TableHead>{t(dict, 'common.date')}</TableHead>
                  <TableHead>{t(dict, 'common.partner')}</TableHead>
                  <TableHead>{t(dict, 'common.direction')}</TableHead>
                  <TableHead>{t(dict, 'common.amount')}</TableHead>
                  <TableHead>{t(dict, 'transactions.reference')}</TableHead>
                  <TableHead className="text-right">{t(dict, 'common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell data-label={t(dict, 'common.status')}><StatusBadge status={log.status} /></TableCell>
                    <TableCell data-label={t(dict, 'common.date')}>{log.tested_at ? formatDate(locale, log.tested_at, { dateStyle: 'medium' }) : '\u2014'}</TableCell>
                    <TableCell data-label={t(dict, 'common.partner')}><span className="table-primary-link" dir="auto">{log.partner_name}</span></TableCell>
                    <TableCell data-label={t(dict, 'common.direction')}><StatusBadge status={log.direction} /></TableCell>
                    <TableCell data-label={t(dict, 'common.amount')} className="font-mono">{log.amount} {log.currency}</TableCell>
                    <TableCell data-label={t(dict, 'transactions.reference')} className="font-mono text-sm text-ink-secondary" dir="auto">{log.reference_id || '\u2014'}</TableCell>
                    <TableCell data-label={t(dict, 'common.actions')} data-cell-actions="true" className="text-right">
                      <div className="table-actions justify-end">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/penny-log/${log.id}`}>{t(dict, 'common.view')}</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/penny-log/${log.id}/edit`}>{t(dict, 'common.edit')}</Link>
                        </Button>
                        <form action={deleteLog}>
                          <input type="hidden" name="id" value={log.id} />
                          <Button type="submit" size="sm" variant="destructive">
                            {t(dict, 'common.delete')}
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="mt-4">
            <Pagination
              page={result.page}
              totalPages={result.totalPages}
              total={result.total}
              basePath="/penny-log"
              filters={filterParams}
            />
          </div>
        </>
      ) : (
        <Card className="mt-6">
          <CardContent className="px-4 py-12 text-center text-sm text-muted-foreground">{emptyMessage}</CardContent>
        </Card>
      )}
    </>
  );
}
