import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import db from '@/lib/db';
import * as CredentialModel from '@/models/credential.model';
import RevealButton from '@/components/vault/RevealButton';
import SecretTableRow from '@/components/vault/SecretTableRow';
import VaultDeleteButton from '@/components/vault/VaultDeleteButton';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { envChipClass } from '@/lib/style-utils';

interface VaultShowPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: VaultShowPageProps): Promise<Metadata> {
  const { id } = await params;
  const credential = await CredentialModel.findById(db, Number(id));
  return { title: credential ? credential.label : 'Credential Not Found' };
}

export default async function VaultShowPage({ params }: VaultShowPageProps) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const { id } = await params;
  const credential = await CredentialModel.findById(db, Number(id));

  if (!credential) {
    notFound();
  }

  const envTone = envChipClass(credential.environment);

  return (
    <>
      <section className="page-header">
        <div className="page-breadcrumbs">
          <Link href="/vault" className="font-medium hover:text-ink">{t(dict, 'common.vault')}</Link>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
          </svg>
          <span>{credential.partner_name}</span>
        </div>

        <div className="page-header-row">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="console-title">{credential.partner_name}</h1>
              <span className={`signal-chip ${envTone}`}>{credential.environment}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/vault/${credential.id}/edit`} className="console-button-secondary">{t(dict, 'common.edit')}</Link>
            <VaultDeleteButton
              id={credential.id}
              label={credential.label}
              partnerName={credential.partner_name}
              environment={credential.environment}
              variant="button"
            />
          </div>
        </div>
      </section>

      <section className="section-stack">
        <div className="console-summary-grid">
          <div className="console-summary-card">
            <div className="console-summary-label">{t(dict, 'common.label')}</div>
            <div className="console-summary-value">{credential.label}</div>
          </div>
          <div className="console-summary-card">
            <div className="console-summary-label">{t(dict, 'common.environment')}</div>
            <div className="console-summary-value">{credential.environment}</div>
          </div>
          <div className="console-summary-card">
            <div className="console-summary-label">{t(dict, 'vault.storedItems')}</div>
            <div className="console-summary-value">{credential.items ? credential.items.length : 0}</div>
          </div>
          <div className="console-summary-card">
            <div className="console-summary-label">{t(dict, 'common.created')}</div>
            <div className="console-summary-value">{new Date(credential.created_at).toLocaleString()}</div>
          </div>
          <div className="console-summary-card">
            <div className="console-summary-label">{t(dict, 'common.updated')}</div>
            <div className="console-summary-value">{new Date(credential.updated_at).toLocaleString()}</div>
          </div>
        </div>
      </section>

      {credential.notes && (
        <div className="console-panel mt-6">
          <div className="console-panel-body">
            <div className="console-kicker">{t(dict, 'vault.operatorNotes')}</div>
            <p className="mt-4 text-sm leading-relaxed text-ink-secondary whitespace-pre-wrap">{credential.notes}</p>
          </div>
        </div>
      )}

      <div className="console-table-wrap mt-6">
        <div className="console-panel-header">
          <div>
            <div className="console-kicker">{t(dict, 'vault.storedMaterial')}</div>
            <h2 className="console-section-title mt-3">{t(dict, 'vault.secretsAndFiles')}</h2>
          </div>
        </div>

        {credential.items && credential.items.length > 0 ? (
          <>
            {/* Mobile cards */}
            <div className="record-stack md:hidden px-4 pb-4">
              {credential.items.map((item) => (
                <article key={item.id} className="record-card">
                  <div className="record-card-header">
                    <div>
                      <div className="record-card-title font-mono">{item.item_key}</div>
                      <p className="record-card-copy">
                        {item.item_type === 'file' ? (item.file_name || t(dict, 'vault.uploadedFile')) : t(dict, 'vault.secretMasked')}
                      </p>
                    </div>
                    <span className={`signal-chip ${item.item_type === 'file' ? 'brand' : 'neutral'}`}>{item.item_type}</span>
                  </div>
                  {item.item_type === 'file' ? (
                    <div className="record-actions">
                      {item.file_path && (
                        <a href={item.file_path} download={item.file_name || undefined} className="table-action-link">{t(dict, 'vault.download')}</a>
                      )}
                    </div>
                  ) : (
                    <RevealButton credentialId={credential.id} itemId={item.id!} itemKey={item.item_key} />
                  )}
                </article>
              ))}
            </div>

            {/* Desktop table */}
            <div className="overflow-x-auto hidden md:block">
              <table className="console-table">
                <thead>
                  <tr>
                    <th>{t(dict, 'common.key')}</th>
                    <th>{t(dict, 'common.type')}</th>
                    <th>{t(dict, 'common.value')}</th>
                    <th className="text-right">{t(dict, 'common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {credential.items.map((item) => (
                    <SecretTableRow
                      key={item.id}
                      credentialId={credential.id}
                      itemId={item.id!}
                      itemKey={item.item_key}
                      itemType={item.item_type}
                      fileName={item.file_name}
                      filePath={item.file_path}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="console-empty m-4">
            <div className="console-empty-icon">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div>
              <h3>{t(dict, 'vault.noStoredItems')}</h3>
              <p>{t(dict, 'vault.noStoredItemsDescription')}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
