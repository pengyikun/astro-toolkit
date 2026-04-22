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
import * as TodoModel from '@/models/todo.model';
import { SummaryCard, SummaryGrid } from '@/components/ui/summary-card';
import { getLocaleFromCookies, getDictionary, t } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const scope = await requireAccessScope();
  const locale = await getLocaleFromCookies();
  const dict = getDictionary(locale);

  const [accountCount, credentialCount, pennyLogCount, statusCounts, latestBrief, openTodos] = await Promise.all([
    AccountModel.count(db, scope),
    CredentialModel.count(db, scope),
    PennyTestLogModel.count(db, scope),
    PennyTestLogModel.countByStatus(db, scope),
    BriefModel.findLatestCompleted(db, scope),
    TodoModel.listByOwner(db, scope, 200).then((all) => all.filter((t) => t.status !== 'done')),
  ]);

  const failedCount = statusCounts.failed || 0;
  const pendingCount = statusCounts.pending || 0;

  return (
    <>
      <PageHeader title={t(dict, 'dashboard.overview')} />

      <div className="section-stack">
        {/* At a Glance */}
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

        {/* Todo */}
        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t(dict, 'dashboard.todoItems')}</h2>
            <Link href="/intelligence/todo" className="section-link">{t(dict, 'dashboard.viewAll')}</Link>
          </div>

          <div className="live-feed live-feed-compact">
            {failedCount > 0 && (
              <div className="feed-row">
                <span className="feed-marker feed-marker-danger" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <h4>{`${failedCount} ${t(dict, 'dashboard.failedTransactions')}`}</h4>
                  <Link href="/transactions?status=failed" className="mt-1 inline-flex text-sm font-semibold text-brand hover:text-brand-dark">
                    {t(dict, 'dashboard.openFailureQueue')}
                  </Link>
                </div>
              </div>
            )}
            {pendingCount > 0 && (
              <div className="feed-row">
                <span className="feed-marker feed-marker-warning" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <h4>{`${pendingCount} ${t(dict, 'dashboard.pendingTransactions')}`}</h4>
                  <Link href="/transactions?status=pending" className="mt-1 inline-flex text-sm font-semibold text-brand hover:text-brand-dark">
                    {t(dict, 'dashboard.reviewPending')}
                  </Link>
                </div>
              </div>
            )}
            {openTodos.slice(0, 5).map((todo) => {
              const dotClass = todo.urgency === 'high' ? 'feed-marker-danger' : todo.urgency === 'medium' ? 'feed-marker-warning' : 'feed-marker-success';
              return (
                <div key={todo.id} className="feed-row">
                  <span className={`feed-marker ${dotClass}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <h4 className="truncate">{todo.title}</h4>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {t(dict, `intelligence.urgency${todo.urgency.charAt(0).toUpperCase() + todo.urgency.slice(1)}`)}
                      {todo.source === 'brief' && <span className="mx-1">·</span>}
                      {todo.source === 'brief' && t(dict, 'intelligence.sourceBrief')}
                    </p>
                  </div>
                </div>
              );
            })}
            {failedCount === 0 && pendingCount === 0 && openTodos.length === 0 && (
              <div className="feed-row">
                <span className="feed-marker feed-marker-success" aria-hidden="true" />
                <div>
                  <h4>{t(dict, 'dashboard.nothingUrgent')}</h4>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Latest Brief */}
        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t(dict, 'dashboard.latestSummary')}</h2>
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
        </section>
      </div>
    </>
  );
}
