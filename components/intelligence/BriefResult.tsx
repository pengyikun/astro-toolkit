'use client';

import { useState, useMemo } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SummaryGrid, SummaryCard } from '@/components/ui/summary-card';
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
  const [tab, setTab] = useState<'summary' | 'pending'>('summary');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>('all');

  const hasStructured = !!resultData;
  const hasStructuredSummary = hasStructured && resultData!.summary.length > 0;
  const hasStructuredPending = hasStructured && resultData!.pendingItems.length > 0;

  // ── Stats ──────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!hasStructured) return null;
    const sources = new Set<string>();
    let high = 0;
    for (const s of resultData!.summary) sources.add(normalizeSource(s.source));
    for (const p of resultData!.pendingItems) {
      sources.add(normalizeSource(p.source));
      if (p.urgency === 'high') high++;
    }
    return {
      events: resultData!.summary.length,
      pending: resultData!.pendingItems.length,
      high,
      sources: Array.from(sources),
    };
  }, [hasStructured, resultData]);

  // ── Filters ────────────────────────────────────────────────────────────
  const filteredSummary = useMemo<SummaryItem[]>(() => {
    if (!hasStructured) return [];
    const q = search.trim().toLowerCase();
    return resultData!.summary.filter((s) => {
      if (sourceFilter !== 'all' && normalizeSource(s.source) !== sourceFilter) return false;
      if (q) {
        const hay = [s.description, s.subject, s.counterparty, s.source].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [hasStructured, resultData, search, sourceFilter]);

  const filteredPending = useMemo<PendingItem[]>(() => {
    if (!hasStructured) return [];
    const q = search.trim().toLowerCase();
    return resultData!.pendingItems.filter((p) => {
      if (sourceFilter !== 'all' && normalizeSource(p.source) !== sourceFilter) return false;
      if (urgencyFilter !== 'all' && p.urgency !== urgencyFilter) return false;
      if (q) {
        const hay = [p.item, p.subject, p.counterparty, p.source].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [hasStructured, resultData, search, sourceFilter, urgencyFilter]);

  const summaryCopyText = hasStructuredSummary
    ? filteredSummary.map(summaryItemToText).join('\n')
    : summary;
  const pendingCopyText = hasStructuredPending
    ? filteredPending.map(pendingItemToText).join('\n')
    : pendingItems;

  const hasActiveFilters = search.trim().length > 0 || sourceFilter !== 'all' || urgencyFilter !== 'all';
  const clearFilters = () => { setSearch(''); setSourceFilter('all'); setUrgencyFilter('all'); };

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
                  {briefId && <CreateTodosButton briefId={briefId} />}
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

  // ── Render: structured ─────────────────────────────────────────────────
  return (
    <div className="section-stack">
      {/* Stat row */}
      {stats && (
        <SummaryGrid>
          <SummaryCard
            label={t('intelligence.stat.events')}
            value={
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <span className="text-2xl font-semibold tabular-nums">{stats.events}</span>
              </div>
            }
          />
          <SummaryCard
            label={t('intelligence.stat.pending')}
            value={
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-amber-500" />
                <span className="text-2xl font-semibold tabular-nums">{stats.pending}</span>
              </div>
            }
          />
          <SummaryCard
            label={t('intelligence.stat.high')}
            value={
              <div className="flex items-center gap-2">
                <Flame className={`h-5 w-5 ${stats.high > 0 ? 'text-red-500' : 'text-ink-muted/50'}`} />
                <span className={`text-2xl font-semibold tabular-nums ${stats.high > 0 ? 'text-red-600 dark:text-red-400' : 'text-ink-muted'}`}>
                  {stats.high}
                </span>
              </div>
            }
          />
          <SummaryCard
            label={t('intelligence.stat.sources')}
            value={
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {stats.sources.length === 0 && <span className="text-sm text-ink-muted">—</span>}
                {stats.sources.includes('email') && <SourceBadge source="Email" />}
                {stats.sources.includes('whatsapp') && <SourceBadge source="WhatsApp" />}
              </div>
            }
          />
        </SummaryGrid>
      )}

      {/* Tabs + filter bar + tables */}
      <Card className="overflow-hidden">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'summary' | 'pending')}>
          <div className="px-4 sm:px-5 pt-3 pb-3 border-b border-border flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabsList>
              <TabsTrigger value="summary">
                {t('intelligence.summary')}
                {stats && stats.events > 0 && <CountBadge n={stats.events} />}
              </TabsTrigger>
              <TabsTrigger value="pending">
                {t('intelligence.pendingItems')}
                {stats && stats.pending > 0 && <CountBadge n={stats.pending} />}
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-muted pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('intelligence.filter.searchPlaceholder')}
                  className="h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-transparent text-ink placeholder:text-ink-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-44"
                />
              </div>
              <SourceFilterChips value={sourceFilter} onChange={setSourceFilter} />
              {tab === 'pending' && <UrgencyFilterChips value={urgencyFilter} onChange={setUrgencyFilter} />}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-ink-secondary px-1.5"
                >
                  <X className="h-3 w-3" />
                  {t('common.cancel')}
                </button>
              )}
              {((tab === 'summary' && summaryCopyText) || (tab === 'pending' && pendingCopyText)) && (
                <CopyTextButton text={tab === 'summary' ? summaryCopyText : pendingCopyText} />
              )}
            </div>
          </div>

          <CardContent className="p-0">
            <TabsContent value="summary" className="mt-0">
              {filteredSummary.length > 0 ? (
                <SummaryTable items={filteredSummary} />
              ) : hasActiveFilters ? (
                <EmptyHint text={t('intelligence.filter.noResults')} />
              ) : (
                <EmptyHint text={t('intelligence.noSummary')} />
              )}
            </TabsContent>
            <TabsContent value="pending" className="mt-0">
              {filteredPending.length > 0 ? (
                <PendingTable items={filteredPending} />
              ) : hasActiveFilters ? (
                <EmptyHint text={t('intelligence.filter.noResults')} />
              ) : (
                <EmptyHint text={t('intelligence.noPendingItems')} />
              )}
              {hasStructuredPending && briefId && (
                <div className="border-t border-border px-4 sm:px-5 py-3">
                  <CreateTodosButton briefId={briefId} />
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
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
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/50 last:border-b-0 align-top hover:bg-surface-secondary/30 transition-colors">
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

function CountBadge({ n }: { n: number }) {
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-4 px-1 rounded-full bg-surface-secondary text-[10px] tabular-nums text-ink-muted">
      {n}
    </span>
  );
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
    setTimeout(() => setCopied(false), 2000);
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

function CreateTodosButton({ briefId }: { briefId: number }) {
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
        variant="outline"
        size="sm"
        onClick={handleCreate}
        disabled={status === 'loading'}
      >
        <ListChecks className="h-3.5 w-3.5 mr-1.5" />
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
