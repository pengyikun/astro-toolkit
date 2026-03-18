import type { Metadata } from 'next';
import Link from 'next/link';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import { getAllRegions } from '@/lib/region-schemas';
import Pagination from '@/components/ui/Pagination';
import { deleteAccount } from '@/actions/accounts';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Accounts' };

interface AccountsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const params = await searchParams;
  const filters = {
    region_code: typeof params.region_code === 'string' ? params.region_code : undefined,
    status: typeof params.status === 'string' ? params.status : undefined,
    account_type: typeof params.account_type === 'string' ? params.account_type : undefined,
    search: typeof params.search === 'string' ? params.search : undefined,
    page: typeof params.page === 'string' ? params.page : undefined,
  };

  const result = await AccountModel.findAll(db, filters);
  const regions = getAllRegions();
  const hasFilters = Boolean(filters.region_code || filters.status || filters.account_type);

  const filterParams: Record<string, string> = {};
  if (filters.region_code) filterParams.region_code = filters.region_code;
  if (filters.status) filterParams.status = filters.status;
  if (filters.account_type) filterParams.account_type = filters.account_type;

  return (
    <>
      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>{t(dict, 'common.accounts')}</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>{t(dict, 'accounts.registry')}</span>
        </div>

        <div className="page-header-row">
          <div>
            <h1 className="console-title">{t(dict, 'accounts.accountRegistry')}</h1>
          </div>
          <Link href="/accounts/new" className="console-button-primary">{t(dict, 'accounts.createAccount')}</Link>
        </div>
      </section>

      <form method="GET" action="/accounts" className="console-toolbar list-filter-bar mt-6">
        <div className="flex flex-wrap items-center justify-end gap-4">
          {hasFilters && (
            <Link href="/accounts" className="console-button-ghost !min-h-0 !px-0 text-sm font-semibold">{t(dict, 'accounts.resetFilters')}</Link>
          )}
        </div>

        <div className="list-filter-grid lg:grid-cols-4">
          <div>
            <label className="console-label" htmlFor="filter-region">{t(dict, 'common.region')}</label>
            <select id="filter-region" name="region_code" className="console-select" defaultValue={filters.region_code || ''}>
              <option value="">{t(dict, 'accounts.allRegions')}</option>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="console-label" htmlFor="filter-status">{t(dict, 'common.status')}</label>
            <select id="filter-status" name="status" className="console-select" defaultValue={filters.status || ''}>
              <option value="">{t(dict, 'accounts.allStatuses')}</option>
              <option value="active">{t(dict, 'accounts.active')}</option>
              <option value="archived">{t(dict, 'accounts.archived')}</option>
            </select>
          </div>
          <div>
            <label className="console-label" htmlFor="filter-type">{t(dict, 'accounts.accountType')}</label>
            <select id="filter-type" name="account_type" className="console-select" defaultValue={filters.account_type || ''}>
              <option value="">{t(dict, 'accounts.mockAndReal')}</option>
              <option value="mock">{t(dict, 'accounts.mock')}</option>
              <option value="real">{t(dict, 'accounts.real')}</option>
            </select>
          </div>
          <div className="list-filter-actions">
            <button type="submit" className="console-button-secondary w-full lg:w-auto">{t(dict, 'accounts.applyFilters')}</button>
          </div>
        </div>
      </form>

      {result.data.length > 0 ? (
        <>
          {/* Mobile cards */}
          <div className="record-stack lg:hidden mt-6">
            {result.data.map((account) => (
              <article key={account.id} className="record-card">
                <div className="record-card-header">
                  <div>
                    <Link href={`/accounts/${account.id}`} className="record-card-title hover:text-brand" dir="auto">{account.name}</Link>
                    <p className="record-card-copy">{account.region_code} / <span className="font-mono">{account.currency}</span></p>
                  </div>
                  <span className={`signal-chip ${account.status === 'active' ? 'success' : 'neutral'}`}>{account.status}</span>
                </div>
                <dl className="record-metadata">
                  <div>
                    <dt>{t(dict, 'accounts.accountType')}</dt>
                    <dd>{account.account_type}</dd>
                  </div>
                  <div>
                    <dt>{t(dict, 'common.created')}</dt>
                    <dd>{new Date(account.created_at).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <div className="record-actions">
                  <Link href={`/accounts/${account.id}`} className="table-action-link">{t(dict, 'common.view')}</Link>
                  <Link href={`/accounts/${account.id}/edit`} className="table-action-link">{t(dict, 'common.edit')}</Link>
                  <form action={deleteAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <button type="submit" className="table-action-link danger">{t(dict, 'common.archive')}</button>
                  </form>
                </div>
              </article>
            ))}
          </div>

          {/* Desktop table */}
          <div className="console-table-wrap hidden lg:block mt-6">
            <table className="console-table">
              <thead>
                <tr>
                  <th>{t(dict, 'common.name')}</th>
                  <th>{t(dict, 'common.region')}</th>
                  <th>{t(dict, 'common.type')}</th>
                  <th>{t(dict, 'common.status')}</th>
                  <th>{t(dict, 'common.created')}</th>
                  <th className="text-right">{t(dict, 'common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <Link href={`/accounts/${account.id}`} className="table-primary-link hover:text-brand" dir="auto">{account.name}</Link>
                      <span className="table-secondary-copy font-mono">{account.currency}</span>
                    </td>
                    <td>{account.region_code}</td>
                    <td><span className={`signal-chip ${account.account_type === 'mock' ? 'brand' : 'warning'}`}>{account.account_type}</span></td>
                    <td><span className={`signal-chip ${account.status === 'active' ? 'success' : 'neutral'}`}>{account.status}</span></td>
                    <td>{new Date(account.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <div className="table-actions justify-end">
                        <Link href={`/accounts/${account.id}`} className="table-action-link">{t(dict, 'common.view')}</Link>
                        <Link href={`/accounts/${account.id}/edit`} className="table-action-link">{t(dict, 'common.edit')}</Link>
                        <form action={deleteAccount}>
                          <input type="hidden" name="id" value={account.id} />
                          <button type="submit" className="table-action-link danger">{t(dict, 'common.archive')}</button>
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
              basePath="/accounts"
              filters={filterParams}
            />
          </div>
        </>
      ) : (
        <>
          {/* Mobile empty */}
          <div className="console-table-wrap mt-6 lg:hidden">
            <div className="table-empty-card">
              {hasFilters ? t(dict, 'accounts.noAccountsFiltered') : t(dict, 'accounts.noAccountsYet')}
            </div>
          </div>

          {/* Desktop empty */}
          <div className="console-table-wrap hidden lg:block mt-6">
            <table className="console-table">
              <thead>
                <tr>
                  <th>{t(dict, 'common.name')}</th>
                  <th>{t(dict, 'common.region')}</th>
                  <th>{t(dict, 'common.type')}</th>
                  <th>{t(dict, 'common.status')}</th>
                  <th>{t(dict, 'common.created')}</th>
                  <th className="text-right">{t(dict, 'common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="table-empty-row">
                  <td colSpan={6}>
                    {hasFilters ? t(dict, 'accounts.noAccountsFiltered') : t(dict, 'accounts.noAccountsYet')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
