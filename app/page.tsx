import type { Metadata } from 'next';
import Link from 'next/link';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import * as CredentialModel from '@/models/credential.model';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import StatusBadge from '@/components/ui/StatusBadge';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';

export const metadata: Metadata = { title: 'Dashboard' };

const STATUS_MARKER_CLASS: Record<string, string> = {
  failed: 'feed-marker-danger',
  pending: 'feed-marker-warning',
  returned: '',
  timeout: 'feed-marker-muted',
  success: 'feed-marker-success',
};

export default async function DashboardPage() {
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const [accountCount, credentialCount, pennyLogCount, recentLogs, statusCounts] = await Promise.all([
    AccountModel.count(db),
    CredentialModel.count(db),
    PennyTestLogModel.count(db),
    PennyTestLogModel.findRecent(db, 5),
    PennyTestLogModel.countByStatus(db),
  ]);

  const failedCount = statusCounts.failed || 0;
  const pendingCount = statusCounts.pending || 0;
  const attentionCount = failedCount + pendingCount;

  return (
    <>
      <section className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="console-title">{t(dict, 'dashboard.overview')}</h1>
          </div>
        </div>
      </section>

      <div className="section-stack">
        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t(dict, 'dashboard.atAGlance')}</h2>
          </div>

          <dl className="dashboard-strip" aria-label="Workspace totals">
            <div className="dashboard-strip-item">
              <dt>{t(dict, 'common.accounts')}</dt>
              <dd>{accountCount}</dd>
            </div>
            <div className="dashboard-strip-item">
              <dt>{t(dict, 'common.vault')}</dt>
              <dd>{credentialCount}</dd>
            </div>
            <div className="dashboard-strip-item">
              <dt>{t(dict, 'common.transactions')}</dt>
              <dd>{pennyLogCount}</dd>
            </div>
          </dl>
        </section>

        <section className="grid gap-4 md:gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)] items-stretch">
          <div className="section-block section-block-stretch">
            <div className="section-head">
              <h2 className="console-section-title">{t(dict, 'dashboard.latestTransactions')}</h2>
              <Link href="/penny-log" className="section-link">{t(dict, 'dashboard.viewAll')}</Link>
            </div>

            {recentLogs.length > 0 ? (
              <div className="live-feed flex-1">
                {recentLogs.map((log) => (
                  <div key={log.id} className="feed-row">
                    <span
                      className={`feed-marker ${STATUS_MARKER_CLASS[log.status] || 'feed-marker-success'}`}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 dir="auto">{log.partner_name}</h4>
                        <StatusBadge status={log.status} />
                      </div>
                      <p>
                        <span className="font-mono">{log.amount} {log.currency}</span>
                        <span className="mx-1 text-ink-muted">/</span>
                        {log.direction}
                        <span className="mx-1 text-ink-muted">/</span>
                        <span dir="auto">{log.reference_id || t(dict, 'dashboard.noReferenceLogged')}</span>
                      </p>
                      <Link href={`/penny-log/${log.id}`} className="mt-2 inline-flex text-sm font-semibold text-brand hover:text-brand-dark">
                        {t(dict, 'dashboard.inspect')}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="console-empty">
                <div className="console-empty-icon">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                </div>
                <div>
                  <h3>{t(dict, 'dashboard.noTransactionFeed')}</h3>
                  <p>{t(dict, 'dashboard.feedWillAppear')}</p>
                </div>
                <div className="console-empty-actions">
                  <Link href="/penny-log/new" className="console-button-primary">{t(dict, 'dashboard.recordTransaction')}</Link>
                </div>
              </div>
            )}
          </div>

          <div className="section-block section-block-stretch">
            <div className="section-head">
              <h2 className="console-section-title">{t(dict, 'dashboard.needsAttention')}</h2>
            </div>

            <div className="live-feed live-feed-compact flex-1">
              {failedCount > 0 && (
                <div className="feed-row">
                  <span className="feed-marker feed-marker-danger" aria-hidden="true" />
                  <div>
                    <h4>{`${failedCount} ${t(dict, 'dashboard.failedTransactions')}`}</h4>
                    <Link href="/penny-log?status=failed" className="mt-2 inline-flex text-sm font-semibold text-brand hover:text-brand-dark">
                      {t(dict, 'dashboard.openFailureQueue')}
                    </Link>
                  </div>
                </div>
              )}
              {pendingCount > 0 && (
                <div className="feed-row">
                  <span className="feed-marker feed-marker-warning" aria-hidden="true" />
                  <div>
                    <h4>{`${pendingCount} ${t(dict, 'dashboard.pendingTransactions')}`}</h4>
                    <Link href="/penny-log?status=pending" className="mt-2 inline-flex text-sm font-semibold text-brand hover:text-brand-dark">
                      {t(dict, 'dashboard.reviewPending')}
                    </Link>
                  </div>
                </div>
              )}
              {attentionCount === 0 && (
                <div className="feed-row">
                  <span className="feed-marker feed-marker-success" aria-hidden="true" />
                  <div>
                    <h4>{t(dict, 'dashboard.nothingUrgent')}</h4>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
