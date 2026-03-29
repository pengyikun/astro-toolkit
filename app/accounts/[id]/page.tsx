import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DetailItem, DetailMetadata, DetailSectionCard } from '@/components/ui/detail-card';
import { PageHeader } from '@/components/ui/page-header';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import { deleteAccount } from '@/actions/accounts';
import type { AccountField } from '@/types';
import { formatDate, getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { EditIcon, TrashIcon } from '@/components/ui/Icons';
import { getAccessScope, requireAccessScope } from '@/lib/access';

interface AccountDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AccountDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const scope = await getAccessScope();
  const account = await AccountModel.findById(db, Number(id), scope);
  return { title: account ? account.name : 'Account Not Found' };
}

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
  const scope = await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const { id } = await params;
  const account = await AccountModel.findById(db, Number(id), scope);

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
    { key: 'generic_account_holder', label: t(dict, 'accounts.accountHolder') },
    { key: 'generic_bank_name', label: t(dict, 'accounts.bankName') },
    { key: 'generic_account_number', label: t(dict, 'accounts.accountNumber') },
  ];

  const intlFields = [
    { key: 'generic_iban', label: t(dict, 'accounts.iban'), mono: true },
    { key: 'generic_swift_bic', label: t(dict, 'accounts.swiftBic'), mono: true },
    { key: 'generic_intermediary_bank', label: t(dict, 'accounts.intermediaryBank'), mono: false },
    { key: 'generic_intermediary_swift', label: t(dict, 'accounts.intermediarySwift'), mono: true },
  ];

  const addrFields = [
    { key: 'generic_bank_street', label: t(dict, 'accounts.street') },
    { key: 'generic_bank_city', label: t(dict, 'accounts.city') },
    { key: 'generic_bank_state', label: t(dict, 'accounts.stateProvince') },
    { key: 'generic_bank_postal', label: t(dict, 'accounts.postalCode') },
    { key: 'generic_bank_country', label: t(dict, 'accounts.country') },
  ];

  return (
    <div className="max-w-5xl">
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.accounts'), href: '/accounts' },
          { label: account.name },
        ]}
        title={account.name}
        meta={
          <>
            <StatusBadge status={account.account_type} className="text-[0.8rem]" />
            <StatusBadge status={account.status} className="text-[0.8rem]" />
            <Badge variant={transferType === 'international' ? 'brand' : 'neutral'} className="text-[0.8rem]">
              {transferType === 'international' ? t(dict, 'accounts.international') : t(dict, 'accounts.domestic')}
            </Badge>
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/accounts/${account.id}/edit`}>
                <EditIcon className="w-3.5 h-3.5" />
                {t(dict, 'common.edit')}
              </Link>
            </Button>
            <form action={deleteAccount}>
              <input type="hidden" name="id" value={account.id} />
              <Button type="submit" variant="destructive">
                <TrashIcon className="w-3.5 h-3.5" />
                {t(dict, 'common.archive')}
              </Button>
            </form>
          </>
        }
      />

      <div className="detail-shell">
        <div className="detail-main">
          <DetailSectionCard title={t(dict, 'accounts.accountHolderAndBank')}>
            <DetailMetadata>
              {holderFields.map((f) => (
                <DetailItem
                  key={f.key}
                  label={f.label}
                  value={genericMap[f.key] || '--'}
                  valueClassName={`${genericMap[f.key] ? 'text-ink' : 'text-ink-muted'} ${f.key === 'generic_account_number' ? 'font-mono' : ''}`}
                />
              ))}
            </DetailMetadata>
          </DetailSectionCard>

          <DetailSectionCard title={t(dict, 'accounts.internationalWireDetails')}>
            <DetailMetadata>
              {intlFields.map((f) => (
                <DetailItem
                  key={f.key}
                  label={f.label}
                  value={genericMap[f.key] || '--'}
                  valueClassName={`${genericMap[f.key] ? 'text-ink' : 'text-ink-muted'} ${f.mono ? 'font-mono' : ''}`}
                />
              ))}
            </DetailMetadata>
          </DetailSectionCard>

          {regionFields.length > 0 && (
            <DetailSectionCard title={t(dict, 'accounts.localBankingDetails')}>
              <DetailMetadata>
                {regionFields.map((f) => (
                  <DetailItem
                    key={f.field_key}
                    label={f.field_label}
                    value={
                      f.field_value ? (
                        f.field_type === 'textarea' ? (
                          <pre className="whitespace-pre-wrap font-sans">{f.field_value}</pre>
                        ) : (
                          f.field_value
                        )
                      ) : (
                        <span className="text-ink-muted">--</span>
                      )
                    }
                  />
                ))}
              </DetailMetadata>
            </DetailSectionCard>
          )}

          <DetailSectionCard title={t(dict, 'accounts.bankAddress')}>
            <DetailMetadata>
              {addrFields.map((f) => (
                <DetailItem
                  key={f.key}
                  label={f.label}
                  value={genericMap[f.key] || '--'}
                  valueClassName={genericMap[f.key] ? 'text-ink' : 'text-ink-muted'}
                />
              ))}
            </DetailMetadata>
          </DetailSectionCard>

          {customFields.length > 0 && (
            <DetailSectionCard title={t(dict, 'accounts.customFields')}>
              <DetailMetadata>
                {customFields.map((f) => (
                  <DetailItem key={f.field_key} label={f.field_label} value={f.field_value || '--'} />
                ))}
              </DetailMetadata>
            </DetailSectionCard>
          )}

          <DetailSectionCard title={t(dict, 'common.notes')} titleClassName="mb-3">
            <p className={`text-sm whitespace-pre-wrap ${account.notes ? 'text-ink-secondary' : 'text-ink-muted'}`}>
              {account.notes || '--'}
            </p>
          </DetailSectionCard>
        </div>

        <div className="detail-sidebar">
          <div className="detail-sidebar-inner">
            <DetailSectionCard title={t(dict, 'accounts.accountDetails')} titleClassName="mb-4">
              <dl className="space-y-4">
                <DetailItem label={t(dict, 'common.region')} value={account.region_code} valueClassName="font-medium" />
                <DetailItem label={t(dict, 'common.currency')} value={account.currency} valueClassName="font-mono font-medium" />
                <DetailItem label={t(dict, 'common.type')} value={<StatusBadge status={account.account_type} className="text-[0.8rem]" />} />
                <DetailItem
                  label={t(dict, 'accounts.transfer')}
                  value={
                    <Badge variant={transferType === 'international' ? 'brand' : 'neutral'} className="text-[0.8rem]">
                      {transferType === 'international' ? t(dict, 'accounts.international') : t(dict, 'accounts.domestic')}
                    </Badge>
                  }
                />
                <DetailItem label={t(dict, 'common.status')} value={<StatusBadge status={account.status} className="text-[0.8rem]" />} />
                <DetailItem
                  className="border-t border-border pt-3"
                  label={t(dict, 'common.created')}
                  value={formatDate(locale, account.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
                  valueClassName="detail-date"
                />
                <DetailItem label={t(dict, 'common.updated')} value={formatDate(locale, account.updated_at, { dateStyle: 'medium', timeStyle: 'short' })} valueClassName="detail-date" />
              </dl>
            </DetailSectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
