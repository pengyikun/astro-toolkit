import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import { getAllRegions } from '@/lib/region-schemas';
import Pagination from '@/components/ui/Pagination';
import AccountFilters from '@/components/accounts/AccountFilters';
import { deleteAccount } from '@/actions/accounts';
import { formatDate, getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import StatusBadge from '@/components/ui/StatusBadge';
import { requireAccessScope } from '@/lib/access';

export const metadata: Metadata = { title: 'Accounts' };

interface AccountsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AccountsPage({ searchParams }: AccountsPageProps) {
  const scope = await requireAccessScope();
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

  const result = await AccountModel.findAll(db, filters, scope);
  const regions = getAllRegions();
  const hasFilters = Boolean(filters.region_code || filters.status || filters.account_type);

  const filterParams: Record<string, string> = {};
  if (filters.region_code) filterParams.region_code = filters.region_code;
  if (filters.status) filterParams.status = filters.status;
  if (filters.account_type) filterParams.account_type = filters.account_type;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.accounts') },
          { label: t(dict, 'accounts.registry') },
        ]}
        title={t(dict, 'accounts.accountRegistry')}
        actions={
          <Button asChild>
            <Link href="/accounts/new">{t(dict, 'accounts.createAccount')}</Link>
          </Button>
        }
      />

      <AccountFilters
        regions={regions}
        initialFilters={{
          region_code: filters.region_code,
          status: filters.status,
          account_type: filters.account_type,
        }}
      />

      {result.data.length > 0 ? (
        <>
          <Card className="mt-6 overflow-hidden">
            <Table responsive>
              <TableHeader>
                <TableRow>
                  <TableHead>{t(dict, 'common.name')}</TableHead>
                  <TableHead>{t(dict, 'common.currency')}</TableHead>
                  <TableHead>{t(dict, 'common.region')}</TableHead>
                  <TableHead>{t(dict, 'common.type')}</TableHead>
                  <TableHead>{t(dict, 'common.status')}</TableHead>
                  <TableHead>{t(dict, 'common.created')}</TableHead>
                  <TableHead className="text-right">{t(dict, 'common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell data-label={t(dict, 'common.name')}>
                      <Link href={`/accounts/${account.id}`} className="table-primary-link hover:text-brand" dir="auto">{account.name}</Link>
                    </TableCell>
                    <TableCell data-label={t(dict, 'common.currency')}><span className="font-mono">{account.currency}</span></TableCell>
                    <TableCell data-label={t(dict, 'common.region')}>{account.region_code}</TableCell>
                    <TableCell data-label={t(dict, 'common.type')}><StatusBadge status={account.account_type} /></TableCell>
                    <TableCell data-label={t(dict, 'common.status')}><StatusBadge status={account.status} /></TableCell>
                    <TableCell data-label={t(dict, 'common.created')}>{formatDate(locale, account.created_at, { dateStyle: 'medium' })}</TableCell>
                    <TableCell data-label={t(dict, 'common.actions')} data-cell-actions="true" className="text-right">
                      <div className="table-actions justify-end">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/accounts/${account.id}`}>{t(dict, 'common.view')}</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/accounts/${account.id}/edit`}>{t(dict, 'common.edit')}</Link>
                        </Button>
                        <form action={deleteAccount}>
                          <input type="hidden" name="id" value={account.id} />
                          <Button type="submit" size="sm" variant="destructive">
                            {t(dict, 'common.archive')}
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
              basePath="/accounts"
              filters={filterParams}
            />
          </div>
        </>
      ) : (
        <Card className="mt-6">
          <CardContent className="px-4 py-12 text-center text-sm text-muted-foreground">
            {hasFilters ? t(dict, 'accounts.noAccountsFiltered') : t(dict, 'accounts.noAccountsYet')}
          </CardContent>
        </Card>
      )}
    </>
  );
}
