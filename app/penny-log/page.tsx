import type { Metadata } from 'next';
import Link from 'next/link';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import db from '@/lib/db';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import { deleteLog } from '@/actions/penny-log';
import type { PennyLogFilters } from '@/types';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Penny Test Log' };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function PennyLogListPage({ searchParams }: PageProps) {
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

  const result = await PennyTestLogModel.findAll(db, filters);

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
      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>{t(dict, 'common.transactions')}</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>{t(dict, 'transactions.ledger')}</span>
        </div>

        <div className="page-header-row">
          <div>
            <h1 className="console-title">{t(dict, 'transactions.transactionLedger')}</h1>
          </div>
          <Link href="/penny-log/new" className="console-button-primary">{t(dict, 'transactions.newTransaction')}</Link>
        </div>
      </section>

      <form method="GET" action="/penny-log" className="console-toolbar list-filter-bar mt-6">
        <div className="flex flex-wrap items-center justify-end gap-4">
          {hasFilters && (
            <Link href="/penny-log" className="console-button-ghost console-button-inline text-sm font-semibold">{t(dict, 'accounts.resetFilters')}</Link>
          )}
        </div>

        <div className="list-filter-grid md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="console-label" htmlFor="log-status">{t(dict, 'common.status')}</label>
            <select id="log-status" name="status" className="console-select" defaultValue={params.status || ''}>
              <option value="">{t(dict, 'transactions.allStatuses')}</option>
              {(['pending', 'success', 'failed', 'timeout', 'returned'] as const).map((s) => (
                <option key={s} value={s}>{t(dict, `transactions.${s}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="console-label" htmlFor="log-direction">{t(dict, 'common.direction')}</label>
            <select id="log-direction" name="direction" className="console-select" defaultValue={params.direction || ''}>
              <option value="">{t(dict, 'transactions.inboundAndOutbound')}</option>
              <option value="inbound">{t(dict, 'transactions.inbound')}</option>
              <option value="outbound">{t(dict, 'transactions.outbound')}</option>
            </select>
          </div>
          <div>
            <label className="console-label" htmlFor="log-partner">{t(dict, 'common.partner')}</label>
            <input type="text" id="log-partner" name="partner_name" defaultValue={params.partner_name || ''} placeholder={t(dict, 'transactions.partnerName')} className="console-input" />
          </div>
          <div>
            <label className="console-label" htmlFor="log-from">{t(dict, 'transactions.from')}</label>
            <input type="date" id="log-from" name="date_from" defaultValue={params.date_from || ''} className="console-input" />
          </div>
          <div>
            <label className="console-label" htmlFor="log-to">{t(dict, 'transactions.to')}</label>
            <input type="date" id="log-to" name="date_to" defaultValue={params.date_to || ''} className="console-input" />
          </div>
          <div>
            <label className="console-label" htmlFor="log-search">{t(dict, 'common.search')}</label>
            <input type="text" id="log-search" name="search" defaultValue={params.search || ''} placeholder={t(dict, 'transactions.searchPlaceholder')} className="console-input" />
          </div>
        </div>

        <div className="list-filter-actions">
          <button type="submit" className="console-button-secondary">{t(dict, 'accounts.applyFilters')}</button>
          <Link href="/penny-log" className="console-button-ghost">{t(dict, 'common.clear')}</Link>
        </div>
      </form>

      {result.data.length > 0 ? (
        <>
          {/* Mobile card layout */}
          <div className="record-stack md:hidden mt-6">
            {result.data.map((log) => (
              <article key={log.id} className="record-card">
                <div className="record-card-header">
                  <div>
                    <div className="record-card-title" dir="auto">{log.partner_name}</div>
                    <p className="record-card-copy">
                      {log.direction} / <span className="font-mono" dir="auto">{log.reference_id || t(dict, 'transactions.noReference')}</span>
                    </p>
                  </div>
                  <StatusBadge status={log.status} />
                </div>
                <dl className="record-metadata">
                  <div>
                    <dt>{t(dict, 'common.amount')}</dt>
                    <dd className="font-mono">{log.amount} {log.currency}</dd>
                  </div>
                  <div>
                    <dt>{t(dict, 'transactions.testedAt')}</dt>
                    <dd>{log.tested_at ? new Date(log.tested_at).toLocaleDateString() : '\u2014'}</dd>
                  </div>
                </dl>
                <div className="record-actions">
                  <Link href={`/penny-log/${log.id}`} className="table-action-link">{t(dict, 'common.view')}</Link>
                  <Link href={`/penny-log/${log.id}/edit`} className="table-action-link">{t(dict, 'common.edit')}</Link>
                  <form action={deleteLog}>
                    <input type="hidden" name="id" value={log.id} />
                    <button type="submit" className="table-action-link danger">{t(dict, 'common.delete')}</button>
                  </form>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="console-table-wrap hidden md:block mt-6">
            <table className="console-table">
              <thead>
                <tr>
                  <th>{t(dict, 'common.status')}</th>
                  <th>{t(dict, 'common.date')}</th>
                  <th>{t(dict, 'common.partner')}</th>
                  <th>{t(dict, 'common.direction')}</th>
                  <th>{t(dict, 'common.amount')}</th>
                  <th>{t(dict, 'transactions.reference')}</th>
                  <th className="text-right">{t(dict, 'common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((log) => (
                  <tr key={log.id}>
                    <td><StatusBadge status={log.status} /></td>
                    <td>{log.tested_at ? new Date(log.tested_at).toLocaleDateString() : '\u2014'}</td>
                    <td>
                      <span className="table-primary-link" dir="auto">{log.partner_name}</span>
                      <span className="table-secondary-copy">{log.currency}</span>
                    </td>
                    <td><span className="font-semibold">{log.direction}</span></td>
                    <td className="font-mono">{log.amount}</td>
                    <td className="font-mono text-sm text-ink-secondary" dir="auto">{log.reference_id || '\u2014'}</td>
                    <td className="text-right">
                      <div className="table-actions justify-end">
                        <Link href={`/penny-log/${log.id}`} className="table-action-link">{t(dict, 'common.view')}</Link>
                        <Link href={`/penny-log/${log.id}/edit`} className="table-action-link">{t(dict, 'common.edit')}</Link>
                        <form action={deleteLog}>
                          <input type="hidden" name="id" value={log.id} />
                          <button type="submit" className="table-action-link danger">{t(dict, 'common.delete')}</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
        <>
          <div className="console-table-wrap mt-6 md:hidden">
            <div className="table-empty-card">{emptyMessage}</div>
          </div>

          <div className="console-table-wrap hidden md:block mt-6">
            <table className="console-table">
              <thead>
                <tr>
                  <th>{t(dict, 'common.status')}</th>
                  <th>{t(dict, 'common.date')}</th>
                  <th>{t(dict, 'common.partner')}</th>
                  <th>{t(dict, 'common.direction')}</th>
                  <th>{t(dict, 'common.amount')}</th>
                  <th>{t(dict, 'transactions.reference')}</th>
                  <th className="text-right">{t(dict, 'common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="table-empty-row">
                  <td colSpan={7}>{emptyMessage}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
