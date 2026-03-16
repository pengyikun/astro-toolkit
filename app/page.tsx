import type { Metadata } from 'next';
import Link from 'next/link';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import * as CredentialModel from '@/models/credential.model';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import StatusBadge from '@/components/ui/StatusBadge';

export const metadata: Metadata = { title: 'Dashboard' };

const STATUS_MARKER_COLORS: Record<string, string> = {
  failed: 'var(--danger)',
  pending: 'var(--warning)',
  returned: 'var(--brand)',
  timeout: 'var(--ink-muted)',
  success: 'var(--success)',
};

export default async function DashboardPage() {
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
            <h1 className="console-title">Overview</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/penny-log/new" className="console-button-primary">Record Transaction</Link>
            <Link href="/accounts/new" className="console-button-ghost">New account</Link>
          </div>
        </div>
      </section>

      <div className="section-stack">
        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">At a glance</h2>
          </div>

          <dl className="dashboard-strip" aria-label="Workspace totals">
            <div className="dashboard-strip-item">
              <dt>Accounts</dt>
              <dd>{accountCount}</dd>
            </div>
            <div className="dashboard-strip-item">
              <dt>Credentials</dt>
              <dd>{credentialCount}</dd>
            </div>
            <div className="dashboard-strip-item">
              <dt>Transactions</dt>
              <dd>{pennyLogCount}</dd>
            </div>
          </dl>

          <div className="dashboard-links" aria-label="Primary actions">
            <Link href="/accounts/new" className="dashboard-link">Create account</Link>
            <Link href="/vault/new" className="dashboard-link">Store credentials</Link>
            <Link href="/iban" className="dashboard-link">Validate IBAN</Link>
            <Link href="/data" className="dashboard-link">Open settings</Link>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="section-block">
            <div className="section-head">
              <h2 className="console-section-title">Latest transactions</h2>
              <Link href="/penny-log" className="section-link">View all</Link>
            </div>

            {recentLogs.length > 0 ? (
              <div className="live-feed">
                {recentLogs.map((log) => (
                  <div key={log.id} className="feed-row">
                    <span
                      className="feed-marker"
                      style={{ background: STATUS_MARKER_COLORS[log.status] || 'var(--success)' }}
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
                        <span dir="auto">{log.reference_id || 'no reference logged'}</span>
                      </p>
                      <Link href={`/penny-log/${log.id}`} className="mt-2 inline-flex text-sm font-semibold text-brand hover:text-brand-dark">
                        Inspect
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
                  <h3>No transaction feed yet</h3>
                  <p>Recorded runs will appear here once testing begins.</p>
                </div>
                <div className="console-empty-actions">
                  <Link href="/penny-log/new" className="console-button-primary">Record Transaction</Link>
                </div>
              </div>
            )}
          </div>

          <div className="section-block">
            <div className="section-head">
              <h2 className="console-section-title">Needs attention</h2>
            </div>

            <div className="live-feed live-feed-compact">
              {failedCount > 0 && (
                <div className="feed-row">
                  <span className="feed-marker" style={{ background: 'var(--danger)' }} />
                  <div>
                    <h4>{failedCount} failed transaction{failedCount !== 1 ? 's' : ''}</h4>
                    <Link href="/penny-log?status=failed" className="mt-2 inline-flex text-sm font-semibold text-brand hover:text-brand-dark">
                      Open failure queue
                    </Link>
                  </div>
                </div>
              )}
              {pendingCount > 0 && (
                <div className="feed-row">
                  <span className="feed-marker" style={{ background: 'var(--warning)' }} />
                  <div>
                    <h4>{pendingCount} pending transaction{pendingCount !== 1 ? 's' : ''}</h4>
                    <Link href="/penny-log?status=pending" className="mt-2 inline-flex text-sm font-semibold text-brand hover:text-brand-dark">
                      Review pending runs
                    </Link>
                  </div>
                </div>
              )}
              {attentionCount === 0 && (
                <div className="feed-row">
                  <span className="feed-marker" style={{ background: 'var(--success)' }} />
                  <div>
                    <h4>Nothing urgent right now</h4>
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
