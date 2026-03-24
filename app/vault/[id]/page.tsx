import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import StatusBadge from '@/components/ui/StatusBadge';
import { SummaryCard, SummaryGrid } from '@/components/ui/summary-card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import db from '@/lib/db';
import * as CredentialModel from '@/models/credential.model';
import SecretTableRow from '@/components/vault/SecretTableRow';
import VaultDeleteButton from '@/components/vault/VaultDeleteButton';
import { formatDate, getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

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

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.vault'), href: '/vault' },
          { label: credential.partner_name },
        ]}
        title={credential.partner_name}
        meta={<StatusBadge status={credential.environment} className="text-[0.8rem]" />}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/vault/${credential.id}/edit`}>{t(dict, 'common.edit')}</Link>
            </Button>
            <VaultDeleteButton
              id={credential.id}
              label={credential.label}
              partnerName={credential.partner_name}
              environment={credential.environment}
              variant="button"
            />
          </>
        }
      />

      <section className="section-stack">
        <SummaryGrid>
          <SummaryCard label={t(dict, 'common.label')} value={credential.label} />
          <SummaryCard label={t(dict, 'common.environment')} value={credential.environment} />
          <SummaryCard label={t(dict, 'vault.storedItems')} value={credential.items ? credential.items.length : 0} />
          <SummaryCard label={t(dict, 'common.created')} value={formatDate(locale, credential.created_at, { dateStyle: 'medium', timeStyle: 'short' })} valueClassName="detail-date" />
          <SummaryCard label={t(dict, 'common.updated')} value={formatDate(locale, credential.updated_at, { dateStyle: 'medium', timeStyle: 'short' })} valueClassName="detail-date" />
        </SummaryGrid>
      </section>

      {credential.notes && (
        <Card className="mt-6">
          <CardContent>
            <div className="console-kicker">{t(dict, 'vault.operatorNotes')}</div>
            <p className="mt-4 text-sm leading-relaxed text-ink-secondary whitespace-pre-wrap">{credential.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 overflow-hidden">
        <CardContent className="p-0">
          <div className="px-6 pb-4 pt-6">
            <div>
              <div className="console-kicker">{t(dict, 'vault.storedMaterial')}</div>
              <h2 className="mt-3 console-section-title">{t(dict, 'vault.secretsAndFiles')}</h2>
            </div>
          </div>

          {credential.items && credential.items.length > 0 ? (
            <div className="px-4 pb-4 md:px-6 md:pb-6">
              <Table responsive>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t(dict, 'common.key')}</TableHead>
                    <TableHead>{t(dict, 'common.type')}</TableHead>
                    <TableHead>{t(dict, 'common.value')}</TableHead>
                    <TableHead className="text-right">{t(dict, 'common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
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
                </TableBody>
              </Table>
            </div>
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
        </CardContent>
      </Card>
    </>
  );
}
