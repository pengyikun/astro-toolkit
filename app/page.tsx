import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Flame,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { getLocaleFromCookies, getDictionary, t, type Dictionary } from '@/lib/i18n';
import { requireAccessScope } from '@/lib/access';
import type { Todo, TodoUrgency } from '@/types';

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

  const visibleTodos = openTodos.slice(0, 5);
  const totalActionable = failedCount + pendingCount + openTodos.length;
  const highUrgencyCount = openTodos.filter((todo) => todo.urgency === 'high').length;
  const remainingTodos = Math.max(openTodos.length - visibleTodos.length, 0);

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
            <div className="flex items-center gap-2">
              <h2 className="console-section-title">{t(dict, 'dashboard.todoItems')}</h2>
              {highUrgencyCount > 0 && (
                <Badge variant="danger" className="gap-1 px-1.5 py-0 text-[10px]">
                  <Flame className="h-3 w-3" aria-hidden="true" />
                  {highUrgencyCount}
                </Badge>
              )}
              {totalActionable > 0 && (
                <span className="text-xs tabular-nums text-ink-muted">
                  {totalActionable}
                </span>
              )}
            </div>
            <Link href="/intelligence/todo" className="section-link">
              {t(dict, 'dashboard.viewAll')}
            </Link>
          </div>

          <Card>
            <CardContent className="p-1.5 sm:p-2">
              {totalActionable === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium text-ink">
                    {t(dict, 'dashboard.nothingUrgent')}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/40">
                  {failedCount > 0 && (
                    <li>
                      <SystemAlertRow
                        href="/transactions?status=failed"
                        tone="danger"
                        icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                        title={`${failedCount} ${t(dict, 'dashboard.failedTransactions')}`}
                        cta={t(dict, 'dashboard.openFailureQueue')}
                      />
                    </li>
                  )}
                  {pendingCount > 0 && (
                    <li>
                      <SystemAlertRow
                        href="/transactions?status=pending"
                        tone="warning"
                        icon={<Clock className="h-4 w-4" aria-hidden="true" />}
                        title={`${pendingCount} ${t(dict, 'dashboard.pendingTransactions')}`}
                        cta={t(dict, 'dashboard.reviewPending')}
                      />
                    </li>
                  )}
                  {visibleTodos.map((todo) => (
                    <li key={todo.id}>
                      <TodoRow todo={todo} dict={dict} />
                    </li>
                  ))}
                  {remainingTodos > 0 && (
                    <li>
                      <Link
                        href="/intelligence/todo"
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-ink-secondary hover:text-ink transition-colors"
                      >
                        <span>+{remainingTodos} {t(dict, 'dashboard.viewAll')}</span>
                        <ArrowRight className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>
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

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function SystemAlertRow({
  href,
  tone,
  icon,
  title,
  cta,
}: {
  href: string;
  tone: 'danger' | 'warning';
  icon: React.ReactNode;
  title: string;
  cta: string;
}) {
  const toneClasses =
    tone === 'danger'
      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400';

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-secondary/60"
    >
      <span className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full ${toneClasses}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{cta}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted/50 transition-colors group-hover:text-ink-secondary" />
    </Link>
  );
}

function TodoRow({
  todo,
  dict,
}: {
  todo: Todo;
  dict: Dictionary;
}) {
  const isInProgress = todo.status === 'in_progress';
  const StatusIcon = isInProgress ? Clock : Circle;
  const statusClass = isInProgress
    ? 'text-blue-500 dark:text-blue-400'
    : 'text-ink-muted';

  return (
    <Link
      href="/intelligence/todo"
      className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-surface-secondary/60"
    >
      <span className={`shrink-0 mt-0.5 inline-flex h-5 w-5 items-center justify-center ${statusClass}`}>
        <StatusIcon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-snug text-ink">{todo.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
          <UrgencyChip urgency={todo.urgency} dict={dict} />
          {todo.source === 'brief' && (
            <Badge variant="brand" className="inline-flex items-center gap-1 px-1.5 py-0 text-[10px]">
              <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
              {t(dict, 'intelligence.sourceBrief')}
            </Badge>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 mt-1 text-ink-muted/40 opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

function UrgencyChip({
  urgency,
  dict,
}: {
  urgency: TodoUrgency;
  dict: Dictionary;
}) {
  const map: Record<TodoUrgency, { variant: 'danger' | 'warning' | 'success'; key: string; dot: string }> = {
    high: { variant: 'danger', key: 'intelligence.urgencyHigh', dot: 'bg-red-500' },
    medium: { variant: 'warning', key: 'intelligence.urgencyMedium', dot: 'bg-amber-500' },
    low: { variant: 'success', key: 'intelligence.urgencyLow', dot: 'bg-emerald-500' },
  };
  const { variant, key, dot } = map[urgency];
  return (
    <Badge variant={variant} className="inline-flex items-center gap-1 px-1.5 py-0 text-[10px]">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {t(dict, key)}
    </Badge>
  );
}
