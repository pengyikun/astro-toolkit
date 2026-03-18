import type { Metadata } from 'next';
import Link from 'next/link';
import db from '@/lib/db';
import * as CredentialModel from '@/models/credential.model';
import Pagination from '@/components/ui/Pagination';
import VaultDeleteButton from '@/components/vault/VaultDeleteButton';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Credentials Vault' };

interface VaultPageProps {
  searchParams: Promise<{
    partner_name?: string;
    environment?: string;
    search?: string;
    page?: string;
  }>;
}

function envChipClass(env: string): string {
  if (env === 'sandbox') return 'warning';
  if (env === 'staging') return 'brand';
  return 'neutral';
}

export default async function VaultPage({ searchParams }: VaultPageProps) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const filters = await searchParams;
  const [result, partners] = await Promise.all([
    CredentialModel.findAll(db, filters),
    CredentialModel.listPartnerNames(db),
  ]);

  const { data, total, page, totalPages } = result;
  const hasFilters = !!(filters.partner_name || filters.environment || filters.search);

  const filterRecord: Record<string, string> = {};
  if (filters.partner_name) filterRecord.partner_name = filters.partner_name;
  if (filters.environment) filterRecord.environment = filters.environment;
  if (filters.search) filterRecord.search = filters.search;

  return (
    <>
      <section className="page-header">
        <div className="page-breadcrumbs">
          <span>{t(dict, 'common.vault')}</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>{t(dict, 'vault.credentials')}</span>
        </div>

        <div className="page-header-row">
          <div>
            <h1 className="console-title">{t(dict, 'vault.credentialVault')}</h1>
          </div>
          <Link href="/vault/new" className="console-button-primary">{t(dict, 'vault.addCredentialSet')}</Link>
        </div>
      </section>

      <form method="GET" action="/vault" className="console-toolbar list-filter-bar mt-6">
        <div className="flex flex-wrap items-center justify-end gap-4">
          {hasFilters && (
            <Link href="/vault" className="console-button-ghost !min-h-0 !px-0 text-sm font-semibold">{t(dict, 'accounts.resetFilters')}</Link>
          )}
        </div>

        <div className="list-filter-grid lg:grid-cols-4">
          <div>
            <label className="console-label" htmlFor="vault-partner">{t(dict, 'common.partner')}</label>
            <select id="vault-partner" name="partner_name" className="console-select" defaultValue={filters.partner_name || ''}>
              <option value="">{t(dict, 'vault.allPartners')}</option>
              {partners.map((partner) => (
                <option key={partner} value={partner}>{partner}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="console-label" htmlFor="vault-environment">{t(dict, 'common.environment')}</label>
            <select id="vault-environment" name="environment" className="console-select" defaultValue={filters.environment || ''}>
              <option value="">{t(dict, 'vault.allEnvironments')}</option>
              <option value="sandbox">{t(dict, 'vault.sandbox')}</option>
              <option value="staging">{t(dict, 'vault.staging')}</option>
              <option value="uat">{t(dict, 'vault.uat')}</option>
            </select>
          </div>
          <div>
            <label className="console-label" htmlFor="vault-search">{t(dict, 'common.search')}</label>
            <input type="text" id="vault-search" name="search" defaultValue={filters.search || ''} placeholder={t(dict, 'search.placeholder')} className="console-input" />
          </div>
          <div className="list-filter-actions">
            <button type="submit" className="console-button-secondary w-full lg:w-auto">{t(dict, 'accounts.applyFilters')}</button>
          </div>
        </div>
      </form>

      {data.length > 0 ? (
        <>
          {/* Mobile cards */}
          <div className="record-stack lg:hidden mt-6">
            {data.map((cred) => (
              <article key={cred.id} className="record-card">
                <div className="record-card-header">
                  <div>
                    <div className="record-card-title" dir="auto">{cred.partner_name}</div>
                    <p className="record-card-copy" dir="auto">{cred.label}</p>
                  </div>
                  <span className={`signal-chip ${envChipClass(cred.environment)}`}>{cred.environment}</span>
                </div>
                <dl className="record-metadata">
                  <div>
                    <dt>{t(dict, 'common.items')}</dt>
                    <dd>{cred.item_count || 0}</dd>
                  </div>
                  <div>
                    <dt>{t(dict, 'common.created')}</dt>
                    <dd>{new Date(cred.created_at).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <div className="record-actions">
                  <Link href={`/vault/${cred.id}`} className="table-action-link">{t(dict, 'common.view')}</Link>
                  <Link href={`/vault/${cred.id}/edit`} className="table-action-link">{t(dict, 'common.edit')}</Link>
                  <VaultDeleteButton
                    id={cred.id}
                    label={cred.label}
                    partnerName={cred.partner_name}
                    environment={cred.environment}
                  />
                </div>
              </article>
            ))}
          </div>

          {/* Desktop table */}
          <div className="console-table-wrap hidden lg:block mt-6">
            <table className="console-table">
              <thead>
                <tr>
                  <th>{t(dict, 'common.partner')}</th>
                  <th>{t(dict, 'common.environment')}</th>
                  <th>{t(dict, 'common.label')}</th>
                  <th>{t(dict, 'common.items')}</th>
                  <th>{t(dict, 'common.created')}</th>
                  <th className="text-right">{t(dict, 'common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((cred) => (
                  <tr key={cred.id}>
                    <td><span className="table-primary-link" dir="auto">{cred.partner_name}</span></td>
                    <td>
                      <span className={`signal-chip ${envChipClass(cred.environment)}`}>{cred.environment}</span>
                    </td>
                    <td><Link href={`/vault/${cred.id}`} className="table-primary-link hover:text-brand" dir="auto">{cred.label}</Link></td>
                    <td>{cred.item_count || 0}</td>
                    <td>{new Date(cred.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <div className="table-actions justify-end">
                        <Link href={`/vault/${cred.id}`} className="table-action-link">{t(dict, 'common.view')}</Link>
                        <Link href={`/vault/${cred.id}/edit`} className="table-action-link">{t(dict, 'common.edit')}</Link>
                        <VaultDeleteButton
                          id={cred.id}
                          label={cred.label}
                          partnerName={cred.partner_name}
                          environment={cred.environment}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} total={total} basePath="/vault" filters={filterRecord} />
          </div>
        </>
      ) : (
        <>
          <div className="console-table-wrap mt-6 lg:hidden">
            <div className="table-empty-card">
              {hasFilters ? t(dict, 'vault.noCredentialSetsFiltered') : t(dict, 'vault.noCredentialSetsYet')}
            </div>
          </div>

          <div className="console-table-wrap hidden lg:block mt-6">
            <table className="console-table">
              <thead>
                <tr>
                  <th>{t(dict, 'common.partner')}</th>
                  <th>{t(dict, 'common.environment')}</th>
                  <th>{t(dict, 'common.label')}</th>
                  <th>{t(dict, 'common.items')}</th>
                  <th>{t(dict, 'common.created')}</th>
                  <th className="text-right">{t(dict, 'common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                <tr className="table-empty-row">
                  <td colSpan={6}>
                    {hasFilters ? t(dict, 'vault.noCredentialSetsFiltered') : t(dict, 'vault.noCredentialSetsYet')}
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
