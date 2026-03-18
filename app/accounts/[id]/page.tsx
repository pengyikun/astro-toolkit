import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import { deleteAccount } from '@/actions/accounts';
import type { AccountField } from '@/types';

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AccountDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const account = await AccountModel.findById(db, Number(id));
  return { title: account ? account.name : 'Account Not Found' };
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const { id } = await params;
  const account = await AccountModel.findById(db, Number(id));

  if (!account) {
    notFound();
  }

  const allFields: AccountField[] = account.fields || [];

  const genericMap: Record<string, string> = {};
  allFields
    .filter((f) => f.field_key.startsWith('generic_') || f.field_key === 'transfer_type')
    .forEach((f) => {
      genericMap[f.field_key] = f.field_value;
    });

  const regionFields = allFields.filter(
    (f) => !f.is_custom && !f.field_key.startsWith('generic_') && f.field_key !== 'transfer_type'
  );
  const customFields = allFields.filter((f) => f.is_custom);
  const transferType = genericMap['transfer_type'] || 'domestic';

  const holderFields = [
    { key: 'generic_account_holder', label: 'Account Holder' },
    { key: 'generic_bank_name', label: 'Bank Name' },
    { key: 'generic_account_number', label: 'Account Number' },
  ];

  const intlFields = [
    { key: 'generic_iban', label: 'IBAN', mono: true },
    { key: 'generic_swift_bic', label: 'SWIFT / BIC', mono: true },
    { key: 'generic_intermediary_bank', label: 'Intermediary Bank', mono: false },
    { key: 'generic_intermediary_swift', label: 'Intermediary SWIFT', mono: true },
  ];

  const addrFields = [
    { key: 'generic_bank_street', label: 'Street' },
    { key: 'generic_bank_city', label: 'City' },
    { key: 'generic_bank_state', label: 'State / Province' },
    { key: 'generic_bank_postal', label: 'Postal Code' },
    { key: 'generic_bank_country', label: 'Country' },
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <Link href="/accounts" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Accounts
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-ink">{account.name}</h2>
              <div className="flex items-center gap-3 mt-2">
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${account.account_type === 'mock' ? 'text-brand' : 'text-warning'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${account.account_type === 'mock' ? 'bg-brand' : 'bg-warning'}`} />
                  {account.account_type}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${account.status === 'active' ? 'text-success' : 'text-ink-muted'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${account.status === 'active' ? 'bg-success' : 'bg-ink-muted'}`} />
                  {account.status}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${transferType === 'international' ? 'bg-brand-light text-brand' : 'bg-page text-ink-secondary'}`}>
                  {transferType === 'international' ? 'International' : 'Domestic'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/accounts/${account.id}/edit`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-border text-ink hover:bg-page transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                </svg>
                Edit
              </Link>
              <form action={deleteAccount}>
                <input type="hidden" name="id" value={account.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-danger border border-danger-border hover:bg-danger-light hover:text-danger-dark transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Archive
                </button>
              </form>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-5">Account Holder &amp; Bank</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              {holderFields.map((f) => (
                <div key={f.key}>
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">{f.label}</dt>
                  <dd className={`text-sm ${genericMap[f.key] ? 'text-ink' : 'text-ink-muted'} ${f.key === 'generic_account_number' ? 'font-mono' : ''}`}>
                    {genericMap[f.key] || '--'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-5">International Wire Details</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              {intlFields.map((f) => (
                <div key={f.key}>
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">{f.label}</dt>
                  <dd className={`text-sm ${genericMap[f.key] ? 'text-ink' : 'text-ink-muted'} ${f.mono ? 'font-mono' : ''}`}>
                    {genericMap[f.key] || '--'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {regionFields.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-6">
              <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-5">Local Banking Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                {regionFields.map((f) => (
                  <div key={f.field_key}>
                    <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">{f.field_label}</dt>
                    <dd className="text-sm text-ink">
                      {f.field_value ? (
                        f.field_type === 'textarea' ? (
                          <pre className="whitespace-pre-wrap font-sans">{f.field_value}</pre>
                        ) : (
                          f.field_value
                        )
                      ) : (
                        <span className="text-ink-muted">--</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-5">Bank Address</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              {addrFields.map((f) => (
                <div key={f.key}>
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">{f.label}</dt>
                  <dd className={`text-sm ${genericMap[f.key] ? 'text-ink' : 'text-ink-muted'}`}>
                    {genericMap[f.key] || '--'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {customFields.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-6">
              <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-5">Custom Fields</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
                {customFields.map((f) => (
                  <div key={f.field_key}>
                    <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">{f.field_label}</dt>
                    <dd className="text-sm text-ink">{f.field_value || '--'}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-3">Notes</h3>
            <p className={`text-sm whitespace-pre-wrap ${account.notes ? 'text-ink-secondary' : 'text-ink-muted'}`}>
              {account.notes || '--'}
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="bg-white rounded-xl border border-border p-5">
              <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-4">Account Details</h3>
              <dl className="space-y-4">
                <div>
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">Region</dt>
                  <dd className="text-sm text-ink font-medium">{account.region_code}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">Currency</dt>
                  <dd className="text-sm text-ink font-mono font-medium">{account.currency}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">Type</dt>
                  <dd>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${account.account_type === 'mock' ? 'text-brand' : 'text-warning'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${account.account_type === 'mock' ? 'bg-brand' : 'bg-warning'}`} />
                      {account.account_type}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">Transfer</dt>
                  <dd>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${transferType === 'international' ? 'bg-brand-light text-brand' : 'bg-page text-ink-secondary'}`}>
                      {transferType === 'international' ? 'International' : 'Domestic'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">Status</dt>
                  <dd>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${account.status === 'active' ? 'text-success' : 'text-ink-muted'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${account.status === 'active' ? 'bg-success' : 'bg-ink-muted'}`} />
                      {account.status}
                    </span>
                  </dd>
                </div>
                <div className="pt-3 border-t border-border">
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">Created</dt>
                  <dd className="text-xs text-ink-secondary">{new Date(account.created_at).toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-medium text-ink-muted uppercase tracking-wider mb-1">Updated</dt>
                  <dd className="text-xs text-ink-secondary">{new Date(account.updated_at).toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
