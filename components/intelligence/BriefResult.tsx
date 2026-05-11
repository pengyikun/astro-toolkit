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
  Inbox,
  AlertCircle,
  X,
  Sparkles,
  ClipboardList,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { z } from 'zod';
import type { briefResultSchema } from '@/schemas/brief.schema';

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

export default function BriefResult({ summary, pendingItems, resultData, briefId }: BriefResultProps) {
  const { t } = useLocale();

  const hasStructured = !!resultData;
  const hasStructuredSummary = hasStructured && resultData!.summary.length > 0;
  const hasStructuredPending = hasStructured && resultData!.pendingItems.length > 0;

  // ── Render: legacy fallback ────────────────────────────────────────────
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
              {summary ? <LegacyBulletList raw={summary} /> : <EmptyHint text={t('intelligence.noSummary')} />}
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
                <>
                  <LegacyPendingList raw={pendingItems} />
                  {briefId && (
                    <div className="mt-4">
                      <CreateTodosButton briefId={briefId} />
                    </div>
                  )}
                </>
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
          legacyText={summary}
          empty={!hasStructuredSummary}
        />
      </div>

      <div className="brief-fade-up" style={{ animationDelay: '240ms' }}>
        <PendingSection
          items={resultData!.pendingItems}
          legacyText={pendingItems}
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
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
            icon={<Flame className="h-4 w-4" />}
            iconColor={stats.high > 0 ? 'text-red-500' : 'text-ink-muted/50'}
            iconBg={stats.high > 0 ? 'bg-red-500/10' : 'bg-surface-secondary'}
            label={t('intelligence.stat.high')}
            value={stats.high}
            valueClassName={stats.high > 0 ? 'text-red-600 dark:text-red-400' : ''}
          />
          <KpiTile
            icon={<Clock className="h-4 w-4" />}
            iconColor={stats.pastDue > 0 ? 'text-red-500' : 'text-emerald-500'}
            iconBg={stats.pastDue > 0 ? 'bg-red-500/10' : 'bg-emerald-500/10'}
            label={t('intelligence.dashboard.pastDue')}
            value={stats.pastDue}
            valueClassName={stats.pastDue > 0 ? 'text-red-600 dark:text-red-400' : ''}
            footer={
              stats.upcoming > 0 ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
                  <TrendingUp className="h-2.5 w-2.5" />
                  {stats.upcoming} {t('intelligence.dashboard.upcoming')}
                </span>
              ) : undefined
            }
          />
        </div>

        {/* Source breakdown */}
        {stats.totalSource > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-ink-muted">
              <span className="font-medium">{t('intelligence.stat.sources')}</span>
              <span className="tabular-nums">{stats.totalSource}</span>
            </div>
            <div className="brief-source-bar flex h-2 w-full overflow-hidden rounded-full bg-surface-secondary">
              {stats.emailCount > 0 && (
                <div
                  className="bg-blue-500"
                  style={{ width: mounted ? `${stats.emailPct}%` : '0%' }}
                  title={`Email — ${stats.emailCount}`}
                />
              )}
              {stats.whatsappCount > 0 && (
                <div
                  className="bg-emerald-500"
                  style={{ width: mounted ? `${stats.whatsappPct}%` : '0%' }}
                  title={`WhatsApp — ${stats.whatsappCount}`}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {stats.emailCount > 0 && (
                <SourceLegend
                  color="bg-blue-500"
                  Icon={Mail}
                  label="Email"
                  count={stats.emailCount}
                  pct={stats.emailPct}
                />
              )}
              {stats.whatsappCount > 0 && (
                <SourceLegend
                  color="bg-emerald-500"
                  Icon={MessageCircle}
                  label="WhatsApp"
                  count={stats.whatsappCount}
                  pct={stats.whatsappPct}
                />
              )}
            </div>
          </div>
        )}
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
  valueClassName = '',
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
    <div className="rounded-lg border border-border bg-panel/40 p-3 transition-all duration-200 hover:border-border/80 hover:bg-panel/60 hover:-translate-y-0.5">
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md transition-transform duration-200 ${iconBg} ${iconColor}`}>
          {icon}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-ink-muted font-medium">{label}</span>
      </div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums leading-none animate-in fade-in-0 slide-in-from-bottom-1 duration-300 ${valueClassName || 'text-ink'}`}>
        {value}
      </div>
      {footer && <div className="mt-2">{footer}</div>}
    </div>
  );
}

function UrgencyMiniBar({ high, medium, low }: { high: number; medium: number; low: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const total = high + medium + low;
  if (total === 0) return null;
  return (
    <div className="space-y-1">
      <div className="brief-source-bar flex h-1 w-full overflow-hidden rounded-full bg-surface-secondary">
        {high > 0 && <div className="bg-red-500" style={{ width: mounted ? `${(high / total) * 100}%` : '0%' }} />}
        {medium > 0 && <div className="bg-amber-500" style={{ width: mounted ? `${(medium / total) * 100}%` : '0%' }} />}
        {low > 0 && <div className="bg-emerald-500" style={{ width: mounted ? `${(low / total) * 100}%` : '0%' }} />}
      </div>
      <div className="flex gap-2 text-[10px] tabular-nums text-ink-muted">
        {high > 0 && <span className="text-red-500">●{high}</span>}
        {medium > 0 && <span className="text-amber-500">●{medium}</span>}
        {low > 0 && <span className="text-emerald-500">●{low}</span>}
      </div>
    </div>
  );
}

function SourceLegend({
  color,
  Icon,
  label,
  count,
  pct,
}: {
  color: string;
  Icon: typeof Mail;
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
  legacyText,
  empty,
}: {
  items: SummaryItem[];
  legacyText: string;
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
        const hay = [s.description, s.subject, s.counterparty, s.source].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, sourceFilter]);

  const hasActiveFilters = search.trim().length > 0 || sourceFilter !== 'all';
  const copyText = filtered.length > 0
    ? filtered.map(summaryItemToText).join('\n')
    : legacyText;

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
  legacyText,
  empty,
  briefId,
}: {
  items: PendingItem[];
  legacyText: string;
  empty: boolean;
  briefId?: number;
}) {
  const { t } = useLocale();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');

  const filtered = useMemo<PendingItem[]>(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (sourceFilter !== 'all' && normalizeSource(p.source) !== sourceFilter) return false;
      if (urgencyFilter !== 'all' && p.urgency !== urgencyFilter) return false;
      if (q) {
        const hay = [p.item, p.subject, p.counterparty, p.source].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, sourceFilter, urgencyFilter]);

  const hasActiveFilters =
    search.trim().length > 0 || sourceFilter !== 'all' || urgencyFilter !== 'all';
  const copyText = filtered.length > 0
    ? filtered.map(pendingItemToText).join('\n')
    : legacyText;

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
          {hasActiveFilters && (
            <ClearFiltersButton
              onClick={() => {
                setSearch('');
                setSourceFilter('all');
                setUrgencyFilter('all');
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
  const showSubject = items.some((i) => i.subject);
  const showCounterparty = items.some((i) => i.counterparty);
  const showDueDate = items.some((i) => i.dueDate);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface-secondary/40 text-[11px] uppercase tracking-wide text-ink-muted">
            <Th>{t('intelligence.col.source')}</Th>
            <Th>{t('intelligence.col.eventDate')}</Th>
            {showSubject && <Th>{t('intelligence.col.subject')}</Th>}
            {showCounterparty && <Th>{t('intelligence.col.counterparty')}</Th>}
            <Th wide>{t('intelligence.col.description')}</Th>
            {showDueDate && <Th>{t('intelligence.col.dueDate')}</Th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/50 last:border-b-0 align-top hover:bg-surface-secondary/30 transition-colors">
              <Td><SourceBadge source={item.source} /></Td>
              <Td><span className="text-ink-secondary tabular-nums">{item.date || '—'}</span></Td>
              {showSubject && (
                <Td><CellText value={item.subject} truncate /></Td>
              )}
              {showCounterparty && (
                <Td><CellText value={item.counterparty} /></Td>
              )}
              <Td wide><span className="text-ink leading-relaxed">{item.description}</span></Td>
              {showDueDate && (
                <Td>
                  {item.dueDate ? (
                    <span className="inline-flex items-center gap-1 text-ink-secondary tabular-nums">
                      <Calendar className="h-3 w-3 text-ink-muted" />
                      {item.dueDate}
                    </span>
                  ) : <Dash />}
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PendingTable({ items }: { items: PendingItem[] }) {
  const { t } = useLocale();
  const showSubject = items.some((i) => i.subject);
  const showCounterparty = items.some((i) => i.counterparty);
  const showEventDate = items.some((i) => i.eventDate);
  const showDueDate = items.some((i) => i.dueDate);

  // Sort by urgency (high → medium → low) for prioritized display
  const sortedItems = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 } as const;
    return [...items].sort((a, b) => order[a.urgency] - order[b.urgency]);
  }, [items]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface-secondary/40 text-[11px] uppercase tracking-wide text-ink-muted">
            <Th>{t('intelligence.col.urgency')}</Th>
            <Th>{t('intelligence.col.source')}</Th>
            {showSubject && <Th>{t('intelligence.col.subject')}</Th>}
            {showCounterparty && <Th>{t('intelligence.col.counterparty')}</Th>}
            <Th wide>{t('intelligence.col.action')}</Th>
            {showEventDate && <Th>{t('intelligence.col.eventDate')}</Th>}
            {showDueDate && <Th>{t('intelligence.col.dueDate')}</Th>}
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item, i) => (
            <tr
              key={i}
              className={`border-b border-border/50 last:border-b-0 align-top hover:bg-surface-secondary/30 transition-colors ${
                item.urgency === 'high' ? 'bg-red-500/[0.02]' : ''
              }`}
            >
              <Td><UrgencyPill urgency={item.urgency} /></Td>
              <Td><SourceBadge source={item.source} /></Td>
              {showSubject && (
                <Td><CellText value={item.subject} truncate /></Td>
              )}
              {showCounterparty && (
                <Td><CellText value={item.counterparty} /></Td>
              )}
              <Td wide><span className="text-ink leading-relaxed">{item.item}</span></Td>
              {showEventDate && (
                <Td><span className="text-ink-secondary tabular-nums">{item.eventDate || <Dash />}</span></Td>
              )}
              {showDueDate && (
                <Td>
                  {item.dueDate ? (
                    <span className={`inline-flex items-center gap-1 tabular-nums font-medium ${
                      isPastDue(item.dueDate) ? 'text-red-600 dark:text-red-400' : 'text-ink'
                    }`}>
                      <Calendar className="h-3 w-3" />
                      {item.dueDate}
                    </span>
                  ) : <Dash />}
                </Td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Cell primitives ─────────────────────────────────────────────────────

function Th({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <th className={`text-left font-medium px-4 py-2.5 ${wide ? '' : 'whitespace-nowrap'}`}>
      {children}
    </th>
  );
}

function Td({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <td className={`px-4 py-3 ${wide ? '' : 'whitespace-nowrap'}`}>{children}</td>
  );
}

function CellText({ value, truncate }: { value?: string; truncate?: boolean }) {
  if (!value) return <Dash />;
  if (truncate) {
    return (
      <span className="block max-w-[18rem] truncate text-ink" title={value}>
        {value}
      </span>
    );
  }
  return <span className="text-ink whitespace-nowrap">{value}</span>;
}

function Dash() {
  return <span className="text-ink-muted">—</span>;
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-10 w-10 rounded-full bg-surface-secondary flex items-center justify-center mb-3">
        <Inbox className="h-5 w-5 text-ink-muted" />
      </div>
      <p className="text-sm text-ink-secondary">{text}</p>
    </div>
  );
}

// ─── Visual helpers ──────────────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const normalized = normalizeSource(source);
  const isWhatsApp = normalized === 'whatsapp';
  const Icon = isWhatsApp ? MessageCircle : Mail;
  const label = isWhatsApp ? 'WhatsApp' : source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
  const styles = isWhatsApp
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20'
    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-500/20';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${styles}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function UrgencyPill({ urgency }: { urgency: 'high' | 'medium' | 'low' }) {
  const { t } = useLocale();
  const map = {
    high: {
      style: 'bg-red-500/10 text-red-700 dark:text-red-400 ring-red-500/20',
      dot: 'bg-red-500',
      label: t('intelligence.urgencyHigh'),
    },
    medium: {
      style: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 ring-amber-500/20',
      dot: 'bg-amber-500',
      label: t('intelligence.urgencyMedium'),
    },
    low: {
      style: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20',
      dot: 'bg-emerald-500',
      label: t('intelligence.urgencyLow'),
    },
  } as const;
  const { style, dot, label } = map[urgency];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
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

// ─── Legacy fallback rendering ───────────────────────────────────────────

function LegacyBulletList({ raw }: { raw: string }) {
  return (
    <div className="space-y-2">
      {raw.split('\n').filter(Boolean).map((line, i) => (
        <div key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
          <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
          <span>{line.replace(/^[-•*]\s*/, '')}</span>
        </div>
      ))}
    </div>
  );
}

function LegacyPendingList({ raw }: { raw: string }) {
  return (
    <div className="space-y-2">
      {raw.split('\n').filter(Boolean).map((line, i) => {
        const cleaned = line.replace(/^[-•*]\s*/, '');
        let dotColor = 'bg-green-500';
        if (cleaned.includes('[HIGH]') || cleaned.includes('🔴')) dotColor = 'bg-red-500';
        else if (cleaned.includes('[MEDIUM]') || cleaned.includes('🟡')) dotColor = 'bg-yellow-500';

        return (
          <div key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
            <span className={`shrink-0 mt-1.5 h-2 w-2 rounded-full ${dotColor}`} />
            <span>{cleaned.replace(/\[HIGH\]|\[MEDIUM\]|\[LOW\]|🔴|🟡|🟢/g, '').replace(/\*\*\[([^\]]*)\]\*\*/g, '[$1]').trim()}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function normalizeSource(source: string): string {
  const s = source.trim().toLowerCase();
  if (s.includes('whatsapp') || s === 'wa') return 'whatsapp';
  if (s.includes('email') || s === 'mail') return 'email';
  return s;
}

function isPastDue(dueDate: string): boolean {
  try {
    const due = new Date(dueDate + 'T23:59:59');
    return due.getTime() < Date.now();
  } catch {
    return false;
  }
}

function summaryItemToText(s: SummaryItem): string {
  const parts: string[] = [];
  parts.push(`[${s.source}]`);
  if (s.date) parts.push(s.date);
  if (s.subject) parts.push(`«${s.subject}»`);
  if (s.counterparty) parts.push(`(${s.counterparty})`);
  parts.push('—');
  parts.push(s.description);
  if (s.dueDate) parts.push(`(due ${s.dueDate})`);
  return `- ${parts.join(' ')}`;
}

function pendingItemToText(p: PendingItem): string {
  const tag = p.urgency === 'high' ? '🔴' : p.urgency === 'medium' ? '🟡' : '🟢';
  const parts: string[] = [];
  parts.push(tag);
  parts.push(`[${p.source}]`);
  if (p.subject) parts.push(`«${p.subject}»`);
  if (p.counterparty) parts.push(`(${p.counterparty})`);
  parts.push('—');
  parts.push(p.item);
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
