import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DetailItem, DetailMetadata, DetailSectionCard } from '@/components/ui/detail-card';
import { PageHeader } from '@/components/ui/page-header';
import StatusBadge from '@/components/ui/StatusBadge';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import * as AccountModel from '@/models/account.model';
import db from '@/lib/db';
import { deleteLog } from '@/actions/penny-log';
import PayloadViewer from '@/components/penny-log/PayloadViewer';
import { formatDate, getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { EditIcon, TrashIcon } from '@/components/ui/Icons';
import { requireAccessScope } from '@/lib/access';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Transaction #${id}` };
}

export default async function PennyLogDetailPage({ params }: PageProps) {
  const scope = await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const { id } = await params;
  const log = await PennyTestLogModel.findById(db, Number(id), scope);
  if (!log) notFound();

  let account = null;
  if (log.account_id) {
    account = await AccountModel.findById(db, log.account_id, scope);
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        breadcrumbs={[
          { label: t(dict, 'common.transactions'), href: '/penny-log' },
          { label: `Transaction #${log.id}` },
        ]}
        title={`Transaction #${log.id}`}
        meta={
          <>
            <StatusBadge status={log.status} className="text-[0.8rem]" />
            <span className="text-sm text-ink-secondary">{log.partner_name}</span>
            <Badge variant={log.direction === 'inbound' ? 'brand' : 'warning'} className="gap-1 text-[0.8rem]">
              {log.direction === 'inbound' ? (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
                </svg>
              )}
              {log.direction}
            </Badge>
          </>
        }
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/penny-log/${log.id}/edit`}>
                <EditIcon className="w-3.5 h-3.5" />
                {t(dict, 'common.edit')}
              </Link>
            </Button>
            <form action={deleteLog}>
              <input type="hidden" name="id" value={log.id} />
              <Button type="submit" variant="destructive">
                <TrashIcon className="w-3.5 h-3.5" />
                {t(dict, 'common.delete')}
              </Button>
            </form>
          </>
        }
      />

      <DetailSectionCard className="mb-5" title={t(dict, 'transactions.transactionDetails')}>
        <DetailMetadata>
          <DetailItem label={t(dict, 'common.partner')} value={log.partner_name} />
          <DetailItem label={t(dict, 'common.direction')} value={log.direction} />
          <DetailItem label={t(dict, 'transactions.amount')} value={`${log.amount} ${log.currency}`} valueClassName="font-mono" />
          <DetailItem label={t(dict, 'transactions.status')} value={<StatusBadge status={log.status} className="text-[0.8rem]" />} />
          <DetailItem label={t(dict, 'transactions.referenceId')} value={log.reference_id || '\u2014'} valueClassName="font-mono" />
          <DetailItem label={t(dict, 'transactions.testedAt')} value={log.tested_at ? formatDate(locale, log.tested_at, { dateStyle: 'medium', timeStyle: 'short' }) : '\u2014'} />
          <DetailItem
            label={t(dict, 'transactions.linkedAccount')}
            value={
              account ? (
                <Link href={`/accounts/${account.id}`} className="font-medium text-brand hover:text-brand-dark">{account.name}</Link>
              ) : (
                <span className="text-ink-muted">{'\u2014'}</span>
              )
            }
          />
          <DetailItem label={t(dict, 'common.created')} value={formatDate(locale, log.created_at, { dateStyle: 'medium', timeStyle: 'short' })} />
        </DetailMetadata>
      </DetailSectionCard>

      {(log.error_code || log.error_message) && (
        <DetailSectionCard className="mb-5 border-danger-border bg-danger-light/50" title={t(dict, 'transactions.errorDetails')} titleClassName="text-danger">
          <DetailMetadata>
              {log.error_code && (
                <DetailItem label={t(dict, 'transactions.errorCode')} value={log.error_code} valueClassName="font-mono text-danger" />
              )}
              {log.error_message && (
                <DetailItem
                  label={t(dict, 'transactions.errorMessage')}
                  value={log.error_message}
                  valueClassName="text-danger"
                  wide={Boolean(log.error_code)}
                />
              )}
          </DetailMetadata>
        </DetailSectionCard>
      )}

      {log.request_payload && (
        <div className="mb-5">
          <PayloadViewer title={t(dict, 'transactions.requestBody')} payload={log.request_payload} />
        </div>
      )}

      {log.response_payload && (
        <div className="mb-5">
          <PayloadViewer title={t(dict, 'transactions.responseBody')} payload={log.response_payload} />
        </div>
      )}

      {log.notes && (
        <DetailSectionCard title={t(dict, 'common.notes')} titleClassName="mb-4">
          <p className="text-sm text-ink-secondary whitespace-pre-wrap">{log.notes}</p>
        </DetailSectionCard>
      )}
    </div>
  );
}
