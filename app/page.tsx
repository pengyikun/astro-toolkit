import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import * as CredentialModel from '@/models/credential.model';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import * as BriefModel from '@/models/brief.model';
import StatusBadge from '@/components/ui/StatusBadge';
import { SummaryCard, SummaryGrid } from '@/components/ui/summary-card';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { STATUS_MARKER_CLASS } from '@/lib/style-utils';
import { requireAccessScope } from '@/lib/access';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const scope = await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const [accountCount, credentialCount, pennyLogCount, recentLogs, statusCounts, latestBrief] = await Promise.all([
    AccountModel.count(db, scope),
    CredentialModel.count(db, scope),
    PennyTestLogModel.count(db, scope),
    PennyTestLogModel.findRecent(db, 5, scope),
    PennyTestLogModel.countByStatus(db, scope),
    BriefModel.findLatestCompleted(db, scope),
  ]);

  const failedCount = statusCounts.failed || 0;
  const pendingCount = statusCounts.pending || 0;
  const attentionCount = failedCount + pendingCount;

  return (
    <>
      <PageHeader title={t(dict, 'dashboard.overview')} />

      <div className="section-stack">
        <section className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(240px,0.7fr)] items-stretch">
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
                  <Button asChild><Link href="/penny-log/new">{t(dict, 'dashboard.recordTransaction')}</Link></Button>
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

        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t(dict, 'dashboard.atAGlance')}</h2>
          </div>

          <SummaryGrid aria-label="Workspace totals">
            <SummaryCard
              label={t(dict, 'common.accounts')}
              value={accountCount}
              valueClassName="text-lg font-semibold leading-none tracking-tight sm:text-[1.2rem]"
            />
            <SummaryCard
              label={t(dict, 'common.vault')}
              value={credentialCount}
              valueClassName="text-lg font-semibold leading-none tracking-tight sm:text-[1.2rem]"
            />
            <SummaryCard
              label={t(dict, 'common.transactions')}
              value={pennyLogCount}
              valueClassName="text-lg font-semibold leading-none tracking-tight sm:text-[1.2rem]"
            />
          </SummaryGrid>
        </section>

        {/* Latest Brief */}
        <section className="grid gap-4 md:gap-6 xl:grid-cols-2 items-start">
          <div className="section-block">
            <div className="section-head">
              <h2 className="console-section-title flex items-center gap-2">
                <span className="text-base">📋</span>
                {t(dict, 'dashboard.latestSummary')}
              </h2>
              <Link href="/intelligence/brief" className="section-link">{t(dict, 'dashboard.viewAll')}</Link>
            </div>

            {latestBrief?.summary ? (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <div className="mb-2 flex items-center gap-2 text-xs text-ink-muted">
                    <span>{latestBrief.date_from} → {latestBrief.date_to}</span>
                  </div>
                  <div className="space-y-2">
                    {latestBrief.summary.split('\n').filter(Boolean).slice(0, 6).map((line, i) => (
                      <div key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
                        <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                        <span>{line.replace(/^[-•*]\s*/, '')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="px-4 py-8 text-center">
                  <p className="text-sm font-medium text-ink mb-1">{t(dict, 'dashboard.noBriefYet')}</p>
                  <p className="text-sm text-ink-secondary mb-4">{t(dict, 'dashboard.noBriefYetDescription')}</p>
                  <Button asChild variant="outline">
                    <Link href="/intelligence/brief">{t(dict, 'dashboard.generateBrief')}</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="section-block">
            <div className="section-head">
              <h2 className="console-section-title flex items-center gap-2">
                <span className="text-base">⏳</span>
                {t(dict, 'dashboard.pendingItems')}
              </h2>
            </div>

            {latestBrief?.pending_items ? (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <div className="space-y-2">
                    {latestBrief.pending_items.split('\n').filter(Boolean).slice(0, 6).map((line, i) => {
                      const cleaned = line.replace(/^[-•*]\s*/, '');
                      let dotClass = 'bg-green-500';
                      if (cleaned.includes('🔴')) dotClass = 'bg-red-500';
                      else if (cleaned.includes('🟡')) dotClass = 'bg-yellow-500';

                      return (
                        <div key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
                          <span className={`shrink-0 mt-1.5 h-2 w-2 rounded-full ${dotClass}`} />
                          <span>{cleaned}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="px-4 py-8 text-center">
                  <p className="text-sm text-ink-secondary">{t(dict, 'dashboard.noPendingItems')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
