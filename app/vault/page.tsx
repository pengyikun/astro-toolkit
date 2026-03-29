import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import db from '@/lib/db';
import * as CredentialModel from '@/models/credential.model';
import Pagination from '@/components/ui/Pagination';
import VaultFilters from '@/components/vault/VaultFilters';
import VaultDeleteButton from '@/components/vault/VaultDeleteButton';
import { formatDate, getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import StatusBadge from '@/components/ui/StatusBadge';
import { requireAccessScope } from '@/lib/access';

export const metadata: Metadata = { title: 'Credentials Vault' };

interface VaultPageProps {
  searchParams: Promise<{
    partner_name?: string;
    environment?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function VaultPage({ searchParams }: VaultPageProps) {
  const scope = await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const filters = await searchParams;
  const [result, partners] = await Promise.all([
    CredentialModel.findAll(db, filters, scope),
    CredentialModel.listPartnerNames(db, scope),
  ]);

  const { data, total, page, totalPages } = result;
  const hasFilters = !!(filters.partner_name || filters.environment || filters.search);

  const filterRecord: Record<string, string> = {};
  if (filters.partner_name) filterRecord.partner_name = filters.partner_name;
  if (filters.environment) filterRecord.environment = filters.environment;
  if (filters.search) filterRecord.search = filters.search;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.vault') },
          { label: t(dict, 'vault.credentials') },
        ]}
        title={t(dict, 'vault.credentialVault')}
        actions={
          <Button asChild>
            <Link href="/vault/new">{t(dict, 'vault.addCredentialSet')}</Link>
          </Button>
        }
      />

      <VaultFilters
        partners={partners}
        initialFilters={{
          partner_name: filters.partner_name,
          environment: filters.environment,
          search: filters.search,
        }}
      />

      {data.length > 0 ? (
        <>
          <Card className="mt-6 overflow-hidden">
            <Table responsive>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(dict, 'common.partner')}</TableHead>
                  <TableHead>{t(dict, 'common.environment')}</TableHead>
                  <TableHead>{t(dict, 'common.label')}</TableHead>
                  <TableHead>{t(dict, 'common.items')}</TableHead>
                  <TableHead>{t(dict, 'common.created')}</TableHead>
                  <TableHead className="text-right">{t(dict, 'common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell data-label={t(dict, 'common.partner')}>
                      <span className="table-primary-link" dir="auto">{cred.partner_name}</span>
                    </TableCell>
                    <TableCell data-label={t(dict, 'common.environment')}>
                      <StatusBadge status={cred.environment} />
                    </TableCell>
                    <TableCell data-label={t(dict, 'common.label')}><Link href={`/vault/${cred.id}`} className="table-primary-link hover:text-brand" dir="auto">{cred.label}</Link></TableCell>
                    <TableCell data-label={t(dict, 'common.items')}>{cred.item_count || 0}</TableCell>
                    <TableCell data-label={t(dict, 'common.created')}>{formatDate(locale, cred.created_at, { dateStyle: 'medium' })}</TableCell>
                    <TableCell data-label={t(dict, 'common.actions')} data-cell-actions="true" className="text-right">
                      <div className="table-actions justify-end">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/vault/${cred.id}`}>{t(dict, 'common.view')}</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/vault/${cred.id}/edit`}>{t(dict, 'common.edit')}</Link>
                        </Button>
                        <VaultDeleteButton
                          id={cred.id}
                          label={cred.label}
                          partnerName={cred.partner_name}
                          environment={cred.environment}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} total={total} basePath="/vault" filters={filterRecord} />
          </div>
        </>
      ) : (
        <Card className="mt-6">
          <CardContent className="px-4 py-12 text-center text-sm text-muted-foreground">
            {hasFilters ? t(dict, 'vault.noCredentialSetsFiltered') : t(dict, 'vault.noCredentialSetsYet')}
          </CardContent>
        </Card>
      )}
    </>
  );
}
