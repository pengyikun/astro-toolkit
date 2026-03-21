import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import * as AccountModel from '@/models/account.model';
import db from '@/lib/db';
import { deleteLog } from '@/actions/penny-log';
import PayloadViewer from '@/components/penny-log/PayloadViewer';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { STATUS_COLORS, STATUS_DOT_COLORS } from '@/lib/style-utils';
import { ChevronLeftIcon, EditIcon, TrashIcon } from '@/components/ui/Icons';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return { title: `Transaction #${id}` };
}

export default async function PennyLogDetailPage({ params }: PageProps) {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);
  const { id } = await params;
  const log = await PennyTestLogModel.findById(db, Number(id));
  if (!log) notFound();

  let account = null;
  if (log.account_id) {
    account = await AccountModel.findById(db, log.account_id);
  }

  const statusColorClass = STATUS_COLORS[log.status] || 'bg-page text-ink-secondary';
  const statusDotClass = STATUS_DOT_COLORS[log.status] || 'bg-ink-muted';

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/penny-log" className="inline-flex items-center gap-1 text-caption text-ink-secondary hover:text-ink transition-colors">
          <ChevronLeftIcon className="w-3.5 h-3.5" />
          {t(dict, 'transactions.testTransactions')}
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-ink">Transaction #{log.id}</h2>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColorClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`}></span>
              {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-caption text-ink-secondary">{log.partner_name}</span>
            <span className="text-ink-muted">&middot;</span>
            <span className={`inline-flex items-center gap-1 text-xs font-medium ${log.direction === 'inbound' ? 'text-brand' : 'text-success'}`}>
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
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/penny-log/${log.id}/edit`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-border text-ink hover:bg-page transition-colors"
          >
            <EditIcon className="w-3.5 h-3.5" />
            {t(dict, 'common.edit')}
          </Link>
          <form action={deleteLog}>
            <input type="hidden" name="id" value={log.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-danger border border-danger-border hover:bg-danger-light hover:text-danger-dark transition-colors"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              {t(dict, 'common.delete')}
            </button>
          </form>
        </div>
      </div>

      <div className="console-panel console-panel-body mb-5">
        <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-5">{t(dict, 'transactions.transactionDetails')}</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
          <div>
            <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'common.partner')}</dt>
            <dd className="text-sm text-ink mt-1">{log.partner_name}</dd>
          </div>
          <div>
            <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'common.direction')}</dt>
            <dd className="text-sm text-ink mt-1">{log.direction}</dd>
          </div>
          <div>
            <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'transactions.amount')}</dt>
            <dd className="text-sm text-ink mt-1 font-mono">{log.amount} {log.currency}</dd>
          </div>
          <div>
            <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'transactions.status')}</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusColorClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`}></span>
                {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'transactions.referenceId')}</dt>
            <dd className="text-sm text-ink mt-1 font-mono">{log.reference_id || '\u2014'}</dd>
          </div>
          <div>
            <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'transactions.testedAt')}</dt>
            <dd className="text-sm text-ink mt-1">{log.tested_at ? new Date(log.tested_at).toLocaleString() : '\u2014'}</dd>
          </div>
          <div>
            <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'transactions.linkedAccount')}</dt>
            <dd className="text-sm mt-1">
              {account ? (
                <Link href={`/accounts/${account.id}`} className="text-brand hover:text-brand-dark font-medium">{account.name}</Link>
              ) : (
                <span className="text-ink-muted">{'\u2014'}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'common.created')}</dt>
            <dd className="text-sm text-ink mt-1">{new Date(log.created_at).toLocaleString()}</dd>
          </div>
        </dl>
      </div>

      {(log.error_code || log.error_message) && (
        <div className="console-panel console-panel-body border-l-4 border-l-danger mb-5">
          <h3 className="text-xs font-semibold text-danger uppercase tracking-wider mb-5">{t(dict, 'transactions.errorDetails')}</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {log.error_code && (
              <div>
                <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'transactions.errorCode')}</dt>
                <dd className="text-sm text-danger mt-1 font-mono">{log.error_code}</dd>
              </div>
            )}
            {log.error_message && (
              <div className={log.error_code ? '' : 'col-span-2'}>
                <dt className="text-2xs font-medium text-ink-muted uppercase tracking-wider">{t(dict, 'transactions.errorMessage')}</dt>
                <dd className="text-sm text-danger mt-1">{log.error_message}</dd>
              </div>
            )}
          </dl>
        </div>
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
        <div className="console-panel console-panel-body">
          <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-4">{t(dict, 'common.notes')}</h3>
          <p className="text-sm text-ink-secondary whitespace-pre-wrap">{log.notes}</p>
        </div>
      )}
    </div>
  );
}
