import type { Metadata } from 'next';
import Link from 'next/link';
import db from '@/lib/db';
import * as CredentialModel from '@/models/credential.model';
import Pagination from '@/components/ui/Pagination';
import VaultDeleteButton from '@/components/vault/VaultDeleteButton';

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
          <span>Vault</span>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>Credentials</span>
        </div>

        <div className="page-header-row">
          <div>
            <h1 className="console-title">Credential vault</h1>
          </div>
          <Link href="/vault/new" className="console-button-primary">Add Credential Set</Link>
        </div>
      </section>

      <form method="GET" action="/vault" className="console-toolbar list-filter-bar mt-6">
        <div className="flex flex-wrap items-center justify-end gap-4">
          {hasFilters && (
            <Link href="/vault" className="console-button-ghost !min-h-0 !px-0 text-sm font-semibold">Reset filters</Link>
          )}
        </div>

        <div className="list-filter-grid lg:grid-cols-4">
          <div>
            <label className="console-label" htmlFor="vault-partner">Partner</label>
            <select id="vault-partner" name="partner_name" className="console-select" defaultValue={filters.partner_name || ''}>
              <option value="">All partners</option>
              {partners.map((partner) => (
                <option key={partner} value={partner}>{partner}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="console-label" htmlFor="vault-environment">Environment</label>
            <select id="vault-environment" name="environment" className="console-select" defaultValue={filters.environment || ''}>
              <option value="">All environments</option>
              <option value="sandbox">Sandbox</option>
              <option value="staging">Staging</option>
              <option value="uat">UAT</option>
            </select>
          </div>
          <div>
            <label className="console-label" htmlFor="vault-search">Search</label>
            <input type="text" id="vault-search" name="search" defaultValue={filters.search || ''} placeholder="Partner, label, notes" className="console-input" />
          </div>
          <div className="list-filter-actions">
            <button type="submit" className="console-button-secondary w-full lg:w-auto">Apply Filters</button>
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
                    <dt>Items</dt>
                    <dd>{cred.item_count || 0}</dd>
                  </div>
                  <div>
                    <dt>Created</dt>
                    <dd>{new Date(cred.created_at).toLocaleDateString()}</dd>
                  </div>
                </dl>
                <div className="record-actions">
                  <Link href={`/vault/${cred.id}`} className="table-action-link">View</Link>
                  <Link href={`/vault/${cred.id}/edit`} className="table-action-link">Edit</Link>
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
                  <th>Partner</th>
                  <th>Environment</th>
                  <th>Label</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
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
                        <Link href={`/vault/${cred.id}`} className="table-action-link">View</Link>
                        <Link href={`/vault/${cred.id}/edit`} className="table-action-link">Edit</Link>
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
              {hasFilters ? 'No credential sets found for the current filters.' : 'No credential sets yet.'}
            </div>
          </div>

          <div className="console-table-wrap hidden lg:block mt-6">
            <table className="console-table">
              <thead>
                <tr>
                  <th>Partner</th>
                  <th>Environment</th>
                  <th>Label</th>
                  <th>Items</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="table-empty-row">
                  <td colSpan={6}>
                    {hasFilters ? 'No credential sets found for the current filters.' : 'No credential sets yet.'}
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
