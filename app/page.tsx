import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock,
  Flame,
  Mail,
  MessageCircle,
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
            <LatestBriefCard
              dateFrom={latestBrief.date_from}
              dateTo={latestBrief.date_to}
              summary={latestBrief.summary}
              dict={dict}
            />
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

// ─── Latest brief card ─────────────────────────────────────────────────

type ParsedSummaryLine = {
  source: string | null;
  date: string | null;
  description: string;
};

function parseSummaryLines(raw: string, max: number): ParsedSummaryLine[] {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, max);
  return lines.map((line) => {
    // Strip leading bullet
    const cleaned = line.replace(/^[-•*]\s*/, '').trim();
    // Match `**[Source]**` or `[Source]`
    const sourceMatch = cleaned.match(/^\*?\*?\[([^\]]+)\]\*?\*?\s*/);
    const source = sourceMatch ? sourceMatch[1].trim() : null;
    let rest = sourceMatch ? cleaned.slice(sourceMatch[0].length) : cleaned;
    // Match leading ISO date or `YYYY-MM-DD:` or just date followed by space/colon
    const dateMatch = rest.match(/^(\d{4}-\d{2}-\d{2})\s*[:—–-]?\s*/);
    const date = dateMatch ? dateMatch[1] : null;
    if (dateMatch) rest = rest.slice(dateMatch[0].length);
    // Strip remaining leading punctuation
    rest = rest.replace(/^[:—–-]\s*/, '').trim();
    // Drop residual markdown emphasis markers
    rest = rest.replace(/\*\*/g, '');
    return { source, date, description: rest || cleaned };
  });
}

function normalizeSourceKey(source: string | null): 'email' | 'whatsapp' | 'other' {
  if (!source) return 'other';
  const s = source.toLowerCase();
  if (s.includes('whatsapp') || s === 'wa') return 'whatsapp';
  if (s.includes('mail') || s === 'email') return 'email';
  return 'other';
}

function SourceGlyph({ source }: { source: string | null }) {
  const kind = normalizeSourceKey(source);
  if (kind === 'email') {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }
  if (kind === 'whatsapp') {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-ink-muted">
      <Sparkles className="h-3 w-3" aria-hidden="true" />
    </span>
  );
}

function LatestBriefCard({
  dateFrom,
  dateTo,
  summary,
  dict,
}: {
  dateFrom: string;
  dateTo: string;
  summary: string;
  dict: Dictionary;
}) {
  const items = parseSummaryLines(summary, 5);
  const totalLines = summary.split('\n').filter((l) => l.trim()).length;
  const hidden = Math.max(totalLines - items.length, 0);

  return (
    <Card className="overflow-hidden border-brand/15 bg-gradient-to-br from-brand/[0.04] via-transparent to-transparent shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4 sm:p-5">
        {/* Hero bar */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand ring-1 ring-brand/20">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
              <CalendarRange className="h-3.5 w-3.5 text-ink-muted" aria-hidden="true" />
              <span className="tabular-nums">{dateFrom}</span>
              <span className="text-ink-muted/60">→</span>
              <span className="tabular-nums">{dateTo}</span>
            </div>
          </div>
          <Link
            href="/intelligence/brief"
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            {t(dict, 'common.view')}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Items */}
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg px-2 py-2 -mx-2 transition-colors hover:bg-surface-secondary/40"
            >
              <SourceGlyph source={item.source} />
              <div className="min-w-0 flex-1">
                {(item.source || item.date) && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] uppercase tracking-wide text-ink-muted">
                    {item.source && (
                      <span className="font-semibold">{item.source}</span>
                    )}
                    {item.date && (
                      <span className="tabular-nums normal-case font-medium text-ink-muted/80">
                        {item.date}
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-0.5 text-sm leading-snug text-ink line-clamp-2">
                  {item.description}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {hidden > 0 && (
          <div className="mt-3 border-t border-border/40 pt-3 text-center">
            <Link
              href="/intelligence/brief"
              className="inline-flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink transition-colors"
            >
              <span>+{hidden} {t(dict, 'dashboard.viewAll')}</span>
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
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
