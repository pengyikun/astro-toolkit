'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createTodosFromBrief } from '@/actions/intelligence';
import {
  Copy,
  Check,
  ListChecks,
  Mail,
  MessageCircle,
  Search,
  Flame,
  Calendar,
  AlertCircle,
  X,
  Sparkles,
  ClipboardList,
  Clock,
  TrendingUp,
  User,
  Users,
  Globe,
} from 'lucide-react';
import type { z } from 'zod';
import type { briefResultSchema } from '@/schemas/brief.schema';
import {
  Th,
  Td,
  EmptyHint,
  CellText,
  SourceBadge,
  WaitingOnPill,
  CategoryBadge,
  CounterpartyCell,
  MessageCountCell,
  UrgencyPill,
  DueDateCell,
  EventDateCell,
  normalizeSource,
  isPastDue,
} from './_brief-cells';

type BriefResultData = z.infer<typeof briefResultSchema>;
type SummaryItem = BriefResultData['summary'][number];
type PendingItem = BriefResultData['pendingItems'][number];

interface BriefResultProps {
  summary: string;
  pendingItems: string;
  resultData?: BriefResultData | null;
  briefId?: number;
}

type SourceFilter = 'all' | 'email' | 'whatsapp';
type UrgencyFilter = 'all' | 'high' | 'medium' | 'low';
type WaitingFilter = 'all' | 'me' | 'them' | 'external';

export default function BriefResult({ summary, pendingItems, resultData, briefId }: BriefResultProps) {
  const { t } = useLocale();

  const hasStructured = !!resultData;
  const hasStructuredSummary = hasStructured && resultData!.summary.length > 0;
  const hasStructuredPending = hasStructured && resultData!.pendingItems.length > 0;

  // ── Render: legacy fallback (briefs without result_data) ──────────────
  // Old briefs predating structured result_data only have markdown text.
  // Show it raw so the data is still accessible; new briefs always go through
  // the structured tables.
  if (!hasStructured) {
    return (
      <div className="space-y-4">
        <section className="section-block">
          <div className="section-head flex items-center justify-between">
            <h2 className="console-section-title">{t('intelligence.summary')}</h2>
            {summary && <CopyTextButton text={summary} />}
          </div>
          <Card>
            <CardContent className="p-4 sm:p-5">
              {summary ? (
                <LegacyTextBlock raw={summary} />
              ) : (
                <EmptyHint text={t('intelligence.noSummary')} />
              )}
            </CardContent>
          </Card>
        </section>
        <section className="section-block">
          <div className="section-head flex items-center justify-between">
            <h2 className="console-section-title">{t('intelligence.pendingItems')}</h2>
            {pendingItems && <CopyTextButton text={pendingItems} />}
          </div>
          <Card>
            <CardContent className="p-4 sm:p-5">
              {pendingItems ? (
                <LegacyTextBlock raw={pendingItems} />
              ) : (
                <EmptyHint text={t('intelligence.noPendingItems')} />
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    );
  }

  // ── Render: structured (AI artifact) ───────────────────────────────────
  return (
    <div className="section-stack">
      <div className="brief-fade-up" style={{ animationDelay: '0ms' }}>
        <Dashboard data={resultData!} />
      </div>

      <div className="brief-fade-up" style={{ animationDelay: '120ms' }}>
        <SummarySection
          items={resultData!.summary}
          empty={!hasStructuredSummary}
        />
      </div>

      <div className="brief-fade-up" style={{ animationDelay: '240ms' }}>
        <PendingSection
          items={resultData!.pendingItems}
          empty={!hasStructuredPending}
          briefId={briefId}
        />
      </div>
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────

function Dashboard({ data }: { data: BriefResultData }) {
  const { t } = useLocale();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const stats = useMemo(() => {
    let emailCount = 0;
    let whatsappCount = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let pastDue = 0;
    let upcoming = 0;
    let onMe = 0;
    let onThem = 0;
    let onExternal = 0;

    const tally = (src: string) => {
      const n = normalizeSource(src);
      if (n === 'email') emailCount++;
      else if (n === 'whatsapp') whatsappCount++;
    };

    for (const s of data.summary) tally(s.source);
    for (const p of data.pendingItems) {
      tally(p.source);
      if (p.urgency === 'high') high++;
      else if (p.urgency === 'medium') medium++;
      else low++;
      if (p.dueDate) {
        if (isPastDue(p.dueDate)) pastDue++;
        else upcoming++;
      }
      // Pending items default to "me" — that is what makes them "pending" for the user.
      const w = p.waitingOn ?? 'me';
      if (w === 'me') onMe++;
      else if (w === 'them') onThem++;
      else onExternal++;
    }

    const totalSource = emailCount + whatsappCount;
    return {
      events: data.summary.length,
      pending: data.pendingItems.length,
      high,
      medium,
      low,
      pastDue,
      upcoming,
      onMe,
      onThem,
      onExternal,
      emailCount,
      whatsappCount,
      totalSource,
      emailPct: totalSource ? Math.round((emailCount / totalSource) * 100) : 0,
      whatsappPct: totalSource ? Math.round((whatsappCount / totalSource) * 100) : 0,
    };
  }, [data]);

  return (
    <Card className="overflow-hidden border-brand/20 bg-gradient-to-br from-brand/[0.04] via-transparent to-transparent shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Hero */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-10 w-10 rounded-lg bg-brand/10 ring-1 ring-brand/20 flex items-center justify-center transition-transform duration-300 hover:scale-110 hover:rotate-6">
            <Sparkles className="h-5 w-5 text-brand animate-in zoom-in-75 duration-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-ink">
              {t('intelligence.dashboard.title')}
            </h2>
            <p className="mt-0.5 text-xs text-ink-secondary leading-relaxed">
              {t('intelligence.dashboard.subtitle')
                .replace('{events}', String(stats.events))
                .replace('{pending}', String(stats.pending))}
            </p>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          <KpiTile
            icon={<Calendar className="h-4 w-4" />}
            iconColor="text-blue-500"
            iconBg="bg-blue-500/10"
            label={t('intelligence.stat.events')}
            value={stats.events}
          />
          <KpiTile
            icon={<ClipboardList className="h-4 w-4" />}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
            label={t('intelligence.stat.pending')}
            value={stats.pending}
            footer={
              stats.pending > 0 ? (
                <UrgencyMiniBar high={stats.high} medium={stats.medium} low={stats.low} />
              ) : undefined
            }
          />
          <KpiTile
            icon={<User className="h-4 w-4" />}
            iconColor={stats.onMe > 0 ? 'text-violet-500' : 'text-ink-muted/50'}
            iconBg={stats.onMe > 0 ? 'bg-violet-500/10' : 'bg-surface-secondary'}
            label={t('intelligence.stat.onMe')}
            value={stats.onMe}
            valueClassName={stats.onMe > 0 ? 'text-violet-600 dark:text-violet-400' : ''}
            footer={
              stats.onThem + stats.onExternal > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
                  <Users className="h-2.5 w-2.5" />
                  {stats.onThem} {t('intelligence.waitingOn.them').toLowerCase()}
                  {stats.onExternal > 0 ? ` · ${stats.onExternal} ${t('intelligence.waitingOn.external').toLowerCase()}` : ''}
                </span>
              ) : undefined
            }
          />
          <KpiTile
            icon={<Flame className="h-4 w-4" />}
            iconColor={stats.high > 0 ? 'text-red-500' : 'text-ink-muted/50'}
            iconBg={stats.high > 0 ? 'bg-red-500/10' : 'bg-surface-secondary'}
            label={t('intelligence.stat.high')}
            value={stats.high}
            valueClassName={stats.high > 0 ? 'text-red-600 dark:text-red-400' : ''}
            footer={
              stats.pastDue > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 font-medium">
                  <Clock className="h-2.5 w-2.5" />
                  {stats.pastDue} {t('intelligence.dashboard.pastDue').toLowerCase()}
                </span>
              ) : stats.upcoming > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
                  <Calendar className="h-2.5 w-2.5" />
                  {stats.upcoming} {t('intelligence.dashboard.upcoming')}
                </span>
              ) : undefined
            }
          />
          <KpiTile
            icon={<TrendingUp className="h-4 w-4" />}
            iconColor="text-indigo-500"
            iconBg="bg-indigo-500/10"
            label={t('intelligence.stat.sources')}
            value={stats.totalSource}
            footer={
              stats.totalSource > 0 ? (
                <SourceMiniBar emailCount={stats.emailCount} whatsappCount={stats.whatsappCount} mounted={mounted} />
              ) : undefined
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

function KpiTile({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  valueClassName,
  footer,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: number;
  valueClassName?: string;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5 flex flex-col gap-1 transition-all duration-200 hover:border-border/80 hover:shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wide font-medium text-ink-muted">{label}</span>
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${iconBg} ${iconColor}`}>
          {icon}
        </span>
      </div>
      <div className={`text-2xl font-semibold tabular-nums leading-none ${valueClassName ?? 'text-ink'}`}>
        {value}
      </div>
      {footer && <div className="mt-0.5">{footer}</div>}
    </div>
  );
}

function UrgencyMiniBar({ high, medium, low }: { high: number; medium: number; low: number }) {
  const total = high + medium + low;
  if (total === 0) return null;
  const highPct = (high / total) * 100;
  const medPct = (medium / total) * 100;
  const lowPct = (low / total) * 100;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 rounded-full overflow-hidden bg-surface-secondary flex">
        {high > 0 && <div className="bg-red-500 transition-all" style={{ width: `${highPct}%` }} />}
        {medium > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${medPct}%` }} />}
        {low > 0 && <div className="bg-emerald-500 transition-all" style={{ width: `${lowPct}%` }} />}
      </div>
      <span className="text-[10px] tabular-nums text-ink-muted">
        {high > 0 && `${high}H`}
        {high > 0 && medium > 0 && '·'}
        {medium > 0 && `${medium}M`}
        {(high > 0 || medium > 0) && low > 0 && '·'}
        {low > 0 && `${low}L`}
      </span>
    </div>
  );
}

function SourceMiniBar({
  emailCount,
  whatsappCount,
  mounted,
}: {
  emailCount: number;
  whatsappCount: number;
  mounted: boolean;
}) {
  const total = emailCount + whatsappCount;
  if (total === 0) return null;
  const emailPct = (emailCount / total) * 100;
  const waPct = (whatsappCount / total) * 100;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
      {emailCount > 0 && (
        <SourceLegend Icon={Mail} color="bg-blue-500" label="Email" count={emailCount} pct={emailPct} />
      )}
      {whatsappCount > 0 && (
        <SourceLegend Icon={MessageCircle} color="bg-emerald-500" label="WhatsApp" count={whatsappCount} pct={waPct} />
      )}
      <div
        className="w-full h-1 rounded-full overflow-hidden bg-surface-secondary flex"
        aria-hidden="true"
      >
        {emailCount > 0 && (
          <div
            className="bg-blue-500 transition-all duration-700 ease-out"
            style={{ width: mounted ? `${emailPct}%` : '0%' }}
          />
        )}
        {whatsappCount > 0 && (
          <div
            className="bg-emerald-500 transition-all duration-700 ease-out"
            style={{ width: mounted ? `${waPct}%` : '0%' }}
          />
        )}
      </div>
    </div>
  );
}

function SourceLegend({
  Icon,
  color,
  label,
  count,
  pct,
}: {
  Icon: typeof Mail;
  color: string;
  label: string;
  count: number;
  pct: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-secondary">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <Icon className="h-3 w-3 text-ink-muted" />
      <span className="font-medium text-ink">{label}</span>
      <span className="text-ink-muted tabular-nums">
        {count} <span className="text-ink-muted/60">({pct}%)</span>
      </span>
    </span>
  );
}

// ─── Summary section ────────────────────────────────────────────────────

function SummarySection({
  items,
  empty,
}: {
  items: SummaryItem[];
  empty: boolean;
}) {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');

  const filtered = useMemo<SummaryItem[]>(() => {
    const q = search.trim().toLowerCase();
    return items.filter((s) => {
      if (sourceFilter !== 'all' && normalizeSource(s.source) !== sourceFilter) return false;
      if (q) {
        const hay = [s.description, s.subject, s.counterparty, s.source, s.category].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, sourceFilter]);

  const hasActiveFilters = search.trim().length > 0 || sourceFilter !== 'all';
  const copyText = filtered.length > 0 ? filtered.map(summaryItemToText).join('\n') : '';

  return (
    <Card className="overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <SectionHeader
        icon={<Calendar className="h-4 w-4 text-blue-500" />}
        iconBg="bg-blue-500/10"
        title={t('intelligence.section.activity.title')}
        subtitle={t('intelligence.section.activity.subtitle')}
        count={items.length}
        right={copyText ? <CopyTextButton text={copyText} /> : null}
      />

      {!empty && (
        <div className="px-4 sm:px-5 py-2.5 border-y border-border bg-surface-secondary/20 flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} />
          <SourceFilterChips value={sourceFilter} onChange={setSourceFilter} />
          {hasActiveFilters && (
            <ClearFiltersButton onClick={() => { setSearch(''); setSourceFilter('all'); }} />
          )}
          <span className="ml-auto text-[11px] text-ink-muted tabular-nums">
            {filtered.length} / {items.length}
          </span>
        </div>
      )}

      <CardContent className="p-0">
        {empty ? (
          <EmptyHint text={t('intelligence.noSummary')} />
        ) : filtered.length > 0 ? (
          <SummaryTable items={filtered} />
        ) : (
          <EmptyHint text={t('intelligence.filter.noResults')} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Pending section ────────────────────────────────────────────────────

function PendingSection({
  items,
  empty,
  briefId,
}: {
  items: PendingItem[];
  empty: boolean;
  briefId?: number;
}) {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');
  const [waitingFilter, setWaitingFilter] = useState<WaitingFilter>('all');

  const filtered = useMemo<PendingItem[]>(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (sourceFilter !== 'all' && normalizeSource(p.source) !== sourceFilter) return false;
      if (urgencyFilter !== 'all' && p.urgency !== urgencyFilter) return false;
      if (waitingFilter !== 'all') {
        // Items without an explicit waitingOn default to "me".
        const w = p.waitingOn ?? 'me';
        if (w !== waitingFilter) return false;
      }
      if (q) {
        const hay = [p.item, p.subject, p.counterparty, p.source, p.category]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, sourceFilter, urgencyFilter, waitingFilter]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    sourceFilter !== 'all' ||
    urgencyFilter !== 'all' ||
    waitingFilter !== 'all';
  const copyText = filtered.length > 0 ? filtered.map(pendingItemToText).join('\n') : '';

  return (
    <Card className="overflow-hidden shadow-sm transition-shadow hover:shadow-md">
      <SectionHeader
        icon={<ClipboardList className="h-4 w-4 text-amber-500" />}
        iconBg="bg-amber-500/10"
        title={t('intelligence.section.pending.title')}
        subtitle={t('intelligence.section.pending.subtitle')}
        count={items.length}
        right={
          <div className="flex items-center gap-2">
            {!empty && briefId && <CreateTodosButton briefId={briefId} compact />}
            {copyText && <CopyTextButton text={copyText} />}
          </div>
        }
      />

      {!empty && (
        <div className="px-4 sm:px-5 py-2.5 border-y border-border bg-surface-secondary/20 flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} />
          <SourceFilterChips value={sourceFilter} onChange={setSourceFilter} />
          <UrgencyFilterChips value={urgencyFilter} onChange={setUrgencyFilter} />
          <WaitingFilterChips value={waitingFilter} onChange={setWaitingFilter} />
          {hasActiveFilters && (
            <ClearFiltersButton
              onClick={() => {
                setSearch('');
                setSourceFilter('all');
                setUrgencyFilter('all');
                setWaitingFilter('all');
              }}
            />
          )}
          <span className="ml-auto text-[11px] text-ink-muted tabular-nums">
            {filtered.length} / {items.length}
          </span>
        </div>
      )}

      <CardContent className="p-0">
        {empty ? (
          <EmptyHint text={t('intelligence.noPendingItems')} />
        ) : filtered.length > 0 ? (
          <PendingTable items={filtered} />
        ) : (
          <EmptyHint text={t('intelligence.filter.noResults')} />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Section header ─────────────────────────────────────────────────────

function SectionHeader({
  icon,
  iconBg,
  title,
  subtitle,
  count,
  right,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  count: number;
  right?: React.ReactNode;
}) {
  return (
    <div className="px-4 sm:px-5 py-3 flex items-start gap-3">
      <span className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-md ${iconBg}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-surface-secondary text-[10px] tabular-nums text-ink-secondary font-medium">
            {count}
          </span>
        </div>
        {subtitle && (
          <p className="mt-0.5 text-xs text-ink-muted leading-relaxed">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0 self-center">{right}</div>}
    </div>
  );
}

// ─── Filter widgets ─────────────────────────────────────────────────────

function SearchInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLocale();
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('intelligence.filter.searchPlaceholder')}
        className="h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-transparent text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-44"
      />
    </div>
  );
}

function ClearFiltersButton({ onClick }: { onClick: () => void }) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-secondary px-1.5"
    >
      <X className="h-3 w-3" />
      {t('common.cancel')}
    </button>
  );
}

// ─── Tables ──────────────────────────────────────────────────────────────

function SummaryTable({ items }: { items: SummaryItem[] }) {
  const { t } = useLocale();
  const showCategory = items.some((i) => i.category);
  const showSubject = items.some((i) => i.subject);
  const showCounterparty = items.some((i) => i.counterparty);
  const showMessages = items.some((i) => typeof i.messageCount === 'number');
  const showDueDate = items.some((i) => i.dueDate);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface-secondary/40 text-[11px] uppercase tracking-wide text-ink-muted">
            <Th>{t('intelligence.col.source')}</Th>
            <Th>{t('intelligence.col.eventDate')}</Th>
            {showCategory && <Th>{t('intelligence.col.category')}</Th>}
            {showSubject && <Th>{t('intelligence.col.subject')}</Th>}
            {showCounterparty && <Th>{t('intelligence.col.counterparty')}</Th>}
            <Th wide>{t('intelligence.col.description')}</Th>
            {showMessages && <Th>{t('intelligence.col.messageCount')}</Th>}
            {showDueDate && <Th>{t('intelligence.col.dueDate')}</Th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/50 last:border-b-0 align-top hover:bg-surface-secondary/30 transition-colors">
              <Td><SourceBadge source={item.source} /></Td>
              <Td><EventDateCell date={item.date} /></Td>
              {showCategory && <Td><CategoryBadge category={item.category} /></Td>}
              {showSubject && (
                <Td><CellText value={item.subject} truncate /></Td>
              )}
              {showCounterparty && (
                <Td><CounterpartyCell value={item.counterparty} /></Td>
              )}
              <Td wide><span className="text-ink leading-relaxed">{item.description}</span></Td>
              {showMessages && <Td><MessageCountCell count={item.messageCount} /></Td>}
              {showDueDate && <Td><DueDateCell date={item.dueDate} /></Td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PendingTable({ items }: { items: PendingItem[] }) {
  const { t } = useLocale();
  // waitingOn defaults to "me" when missing — always show the column for pending items.
  const showWaitingOn = true;
  const showCategory = items.some((i) => i.category);
  const showSubject = items.some((i) => i.subject);
  const showCounterparty = items.some((i) => i.counterparty);
  const showMessages = items.some((i) => typeof i.messageCount === 'number');
  const showEventDate = items.some((i) => i.eventDate);
  const showDueDate = items.some((i) => i.dueDate);

  // Sort by waitingOn (me first), then urgency (high → low) for prioritized display
  const sortedItems = useMemo(() => {
    const urgencyOrder = { high: 0, medium: 1, low: 2 } as const;
    const waitingOrder = { me: 0, them: 1, external: 2 } as const;
    return [...items].sort((a, b) => {
      const wa = waitingOrder[(a.waitingOn ?? 'me') as keyof typeof waitingOrder];
      const wb = waitingOrder[(b.waitingOn ?? 'me') as keyof typeof waitingOrder];
      if (wa !== wb) return wa - wb;
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
  }, [items]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface-secondary/40 text-[11px] uppercase tracking-wide text-ink-muted">
            <Th>{t('intelligence.col.urgency')}</Th>
            {showWaitingOn && <Th>{t('intelligence.col.waitingOn')}</Th>}
            <Th>{t('intelligence.col.source')}</Th>
            {showCategory && <Th>{t('intelligence.col.category')}</Th>}
            {showSubject && <Th>{t('intelligence.col.subject')}</Th>}
            {showCounterparty && <Th>{t('intelligence.col.counterparty')}</Th>}
            <Th wide>{t('intelligence.col.action')}</Th>
            {showMessages && <Th>{t('intelligence.col.messageCount')}</Th>}
            {showEventDate && <Th>{t('intelligence.col.eventDate')}</Th>}
            {showDueDate && <Th>{t('intelligence.col.dueDate')}</Th>}
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item, i) => {
            const waitingOn = (item.waitingOn ?? 'me') as 'me' | 'them' | 'external';
            return (
              <tr
                key={i}
                className={`border-b border-border/50 last:border-b-0 align-top hover:bg-surface-secondary/30 transition-colors ${
                  item.urgency === 'high'
                    ? 'bg-red-500/[0.02]'
                    : waitingOn === 'me'
                      ? 'bg-violet-500/[0.02]'
                      : ''
                }`}
              >
                <Td><UrgencyPill urgency={item.urgency} /></Td>
                {showWaitingOn && <Td><WaitingOnPill waitingOn={waitingOn} /></Td>}
                <Td><SourceBadge source={item.source} /></Td>
                {showCategory && <Td><CategoryBadge category={item.category} /></Td>}
                {showSubject && (
                  <Td><CellText value={item.subject} truncate /></Td>
                )}
                {showCounterparty && (
                  <Td><CounterpartyCell value={item.counterparty} /></Td>
                )}
                <Td wide><span className="text-ink leading-relaxed">{item.item}</span></Td>
                {showMessages && <Td><MessageCountCell count={item.messageCount} /></Td>}
                {showEventDate && <Td><EventDateCell date={item.eventDate} /></Td>}
                {showDueDate && <Td><DueDateCell date={item.dueDate} highlightPast /></Td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Filter chips ────────────────────────────────────────────────────────

function SourceFilterChips({
  value,
  onChange,
}: {
  value: SourceFilter;
  onChange: (v: SourceFilter) => void;
}) {
  const { t } = useLocale();
  const options: Array<{ key: SourceFilter; label: string; icon?: React.ReactNode }> = [
    { key: 'all', label: t('intelligence.filter.allSources') },
    { key: 'email', label: t('intelligence.filter.email'), icon: <Mail className="h-3 w-3" /> },
    { key: 'whatsapp', label: t('intelligence.filter.whatsapp'), icon: <MessageCircle className="h-3 w-3" /> },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`inline-flex items-center gap-1 px-2 h-6 text-[11px] rounded transition-colors ${
            value === opt.key ? 'bg-surface-secondary text-ink font-medium' : 'text-ink-muted hover:text-ink-secondary'
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function WaitingFilterChips({
  value,
  onChange,
}: {
  value: WaitingFilter;
  onChange: (v: WaitingFilter) => void;
}) {
  const { t } = useLocale();
  const options: Array<{ key: WaitingFilter; label: string; icon?: React.ReactNode }> = [
    { key: 'all', label: t('intelligence.filter.allWaiting') },
    { key: 'me', label: t('intelligence.filter.onMe'), icon: <User className="h-3 w-3" /> },
    { key: 'them', label: t('intelligence.filter.onThem'), icon: <Users className="h-3 w-3" /> },
    { key: 'external', label: t('intelligence.filter.external'), icon: <Globe className="h-3 w-3" /> },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`inline-flex items-center gap-1 px-2 h-6 text-[11px] rounded transition-colors ${
            value === opt.key ? 'bg-surface-secondary text-ink font-medium' : 'text-ink-muted hover:text-ink-secondary'
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function UrgencyFilterChips({
  value,
  onChange,
}: {
  value: UrgencyFilter;
  onChange: (v: UrgencyFilter) => void;
}) {
  const { t } = useLocale();
  const options: Array<{ key: UrgencyFilter; label: string; dot?: string }> = [
    { key: 'all', label: t('intelligence.filter.allUrgencies') },
    { key: 'high', label: t('intelligence.urgencyHigh'), dot: 'bg-red-500' },
    { key: 'medium', label: t('intelligence.urgencyMedium'), dot: 'bg-amber-500' },
    { key: 'low', label: t('intelligence.urgencyLow'), dot: 'bg-emerald-500' },
  ];
  return (
    <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={`inline-flex items-center gap-1 px-2 h-6 text-[11px] rounded transition-colors ${
            value === opt.key ? 'bg-surface-secondary text-ink font-medium' : 'text-ink-muted hover:text-ink-secondary'
          }`}
        >
          {opt.dot && <span className={`h-1.5 w-1.5 rounded-full ${opt.dot}`} />}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Legacy display ─────────────────────────────────────────────────────

/**
 * Minimal display for briefs predating structured result_data. We show the
 * raw stored text inside a scrollable pre block so the data remains
 * accessible without resurrecting the old markdown parser.
 */
function LegacyTextBlock({ raw }: { raw: string }) {
  return (
    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-ink font-mono">
      {raw}
    </pre>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function summaryItemToText(s: SummaryItem): string {
  const parts: string[] = [];
  parts.push(`[${s.source}]`);
  if (s.date) parts.push(s.date);
  if (s.category) parts.push(`#${s.category}`);
  if (s.subject) parts.push(`«${s.subject}»`);
  if (s.counterparty) parts.push(`(${s.counterparty})`);
  parts.push('—');
  parts.push(s.description);
  if (typeof s.messageCount === 'number' && s.messageCount > 1) {
    parts.push(`[${s.messageCount} msgs]`);
  }
  if (s.dueDate) parts.push(`(due ${s.dueDate})`);
  return `- ${parts.join(' ')}`;
}

function pendingItemToText(p: PendingItem): string {
  const tag = p.urgency === 'high' ? '🔴' : p.urgency === 'medium' ? '🟡' : '🟢';
  const waiting = p.waitingOn ?? 'me';
  const waitingTag = waiting === 'me' ? '👤 on me' : waiting === 'them' ? '👥 on them' : '🌐 external';
  const parts: string[] = [];
  parts.push(tag);
  parts.push(`[${p.source}]`);
  parts.push(`{${waitingTag}}`);
  if (p.category) parts.push(`#${p.category}`);
  if (p.subject) parts.push(`«${p.subject}»`);
  if (p.counterparty) parts.push(`(${p.counterparty})`);
  parts.push('—');
  parts.push(p.item);
  if (typeof p.messageCount === 'number' && p.messageCount > 1) {
    parts.push(`[${p.messageCount} msgs]`);
  }
  if (p.dueDate) parts.push(`(due ${p.dueDate})`);
  else if (p.eventDate) parts.push(`(detected ${p.eventDate})`);
  return `- ${parts.join(' ')}`;
}

// ─── Buttons ─────────────────────────────────────────────────────────────

function CopyTextButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setCopied(false);
    }, 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-secondary transition-colors px-2 h-6 rounded hover:bg-surface-secondary/60"
      aria-label="Copy"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function CreateTodosButton({ briefId, compact }: { briefId: number; compact?: boolean }) {
  const { t } = useLocale();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');

  const handleCreate = async () => {
    setStatus('loading');
    try {
      const result = await createTodosFromBrief(briefId);
      setStatus(result.success ? 'done' : 'error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
        <Check className="h-3.5 w-3.5" />
        {t('intelligence.todosCreated')}
      </p>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={compact ? 'outline' : 'outline'}
        size="sm"
        onClick={handleCreate}
        disabled={status === 'loading'}
        className={compact ? 'h-7 text-xs' : ''}
      >
        <ListChecks className={compact ? 'h-3 w-3 mr-1' : 'h-3.5 w-3.5 mr-1.5'} />
        {status === 'loading' ? t('common.loading') : t('intelligence.createTodosBtn')}
      </Button>
      {status === 'error' && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {t('intelligence.createTodosError')}
        </p>
      )}
    </div>
  );
}
