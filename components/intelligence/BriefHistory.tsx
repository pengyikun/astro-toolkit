'use client';

import { useState, useEffect, useTransition } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { getBriefHistory, getBriefDetail, deleteBrief } from '@/actions/intelligence';
import type { Brief } from '@/types';
import {
  Mail,
  MessageCircle,
  Trash2,
  ChevronRight,
  History,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calendar,
  User,
  Flame,
} from 'lucide-react';

interface BriefHistoryProps {
  refreshKey?: number;
  onViewBrief?: (brief: Brief) => void;
}

export default function BriefHistory({ refreshKey, onViewBrief }: BriefHistoryProps) {
  const { t, formatDate } = useLocale();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [isLoading, startLoadTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    startLoadTransition(async () => {
      const data = await getBriefHistory();
      setBriefs(data);
    });
  }, [refreshKey]);

  const handleView = async (id: number) => {
    if (!onViewBrief) return;
    setLoadingId(id);
    try {
      const detail = await getBriefDetail(id);
      if (detail) onViewBrief(detail);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const formData = new FormData();
    formData.set('id', String(id));
    startDeleteTransition(async () => {
      await deleteBrief(formData);
      setBriefs((prev) => prev.filter((b) => b.id !== id));
    });
  };

  if (isLoading && briefs.length === 0) {
    return (
      <section className="section-block">
        <div className="section-head flex items-center gap-2">
          <History className="h-4 w-4 text-ink-muted" />
          <h2 className="console-section-title">{t('intelligence.history')}</h2>
        </div>
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-ink-muted/20" />
                    <div className="h-3.5 w-32 rounded bg-ink-muted/15" />
                    <div className="h-3 w-40 rounded bg-ink-muted/10" />
                  </div>
                  <div className="h-3 w-20 rounded bg-ink-muted/10" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  if (briefs.length === 0) {
    return null;
  }

  return (
    <section className="section-block">
      <div className="section-head flex items-center gap-2">
        <History className="h-4 w-4 text-ink-muted" />
        <h2 className="console-section-title">{t('intelligence.history')}</h2>
        <span className="text-xs text-ink-muted">·  {briefs.length}</span>
      </div>
      <Card className="shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-2 sm:p-3">
          <ul className="divide-y divide-border/40">
            {briefs.map((brief, idx) => {
              const connectorList: string[] = (() => {
                try { return JSON.parse(brief.connectors); } catch { return []; }
              })();
              const counts = parseCounts(brief.result_data);

              return (
                <li
                  key={brief.id}
                  className="brief-fade-up"
                  style={{ animationDelay: `${Math.min(idx * 35, 280)}ms` }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleView(brief.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleView(brief.id); }}
                    className="group flex items-center gap-3 rounded-lg px-3 py-3 cursor-pointer hover:bg-surface-secondary/60 transition-all duration-200 hover:translate-x-0.5"
                  >
                    <StatusIndicator status={brief.status} />

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {connectorList.map((c) => (
                          <ConnectorChip key={c} type={c} />
                        ))}
                        <span className="inline-flex items-center gap-1 text-xs text-ink-secondary">
                          <Calendar className="h-3 w-3 text-ink-muted" />
                          <span className="tabular-nums">{brief.date_from}</span>
                          <span className="text-ink-muted">→</span>
                          <span className="tabular-nums">{brief.date_to}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-muted flex-wrap">
                        <span>{formatDate(brief.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {brief.status === 'completed' && counts && (
                          <>
                            <span className="text-ink-muted/60">·</span>
                            <span className="tabular-nums">
                              {counts.events} {t('intelligence.stat.events').toLowerCase()},{' '}
                              {counts.pending} {t('intelligence.stat.pending').toLowerCase()}
                            </span>
                            {counts.onMe > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0 text-[10px] font-medium text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/20">
                                <User className="h-2.5 w-2.5" />
                                {counts.onMe} {t('intelligence.stat.onMe').toLowerCase()}
                              </span>
                            )}
                            {counts.high > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0 text-[10px] font-medium text-red-700 dark:text-red-400 ring-1 ring-inset ring-red-500/20">
                                <Flame className="h-2.5 w-2.5" />
                                {counts.high}
                              </span>
                            )}
                          </>
                        )}
                        {brief.status === 'failed' && brief.error && (
                          <>
                            <span className="text-ink-muted/60">·</span>
                            <span className="text-red-500/80 truncate max-w-xs">{brief.error}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {loadingId === brief.id && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-brand" />
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, brief.id)}
                        disabled={isDeleting}
                        className="opacity-0 group-hover:opacity-100 p-1 text-ink-muted hover:text-red-500 transition-all rounded"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <ChevronRight className="h-4 w-4 text-ink-muted/50 group-hover:text-ink-muted transition-colors" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function StatusIndicator({ status }: { status: string }) {
  if (status === 'completed') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />;
  }
  if (status === 'failed') {
    return <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />;
  }
  return <Loader2 className="h-4 w-4 text-amber-500 shrink-0 animate-spin" />;
}

function ConnectorChip({ type }: { type: string }) {
  const isWA = type.toLowerCase().includes('whatsapp');
  const Icon = isWA ? MessageCircle : Mail;
  const label = isWA ? 'WhatsApp' : 'Email';
  const styles = isWA
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${styles}`}>
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

function parseCounts(
  raw: string | null | undefined,
): { events: number; pending: number; onMe: number; high: number } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const events = Array.isArray(parsed.summary) ? parsed.summary.length : 0;
    const pendingArr: Array<{ urgency?: string; waitingOn?: string }> = Array.isArray(parsed.pendingItems)
      ? parsed.pendingItems
      : [];
    let onMe = 0;
    let high = 0;
    for (const p of pendingArr) {
      // Pending items default to "me" — that's what makes them pending for the user.
      if ((p.waitingOn ?? 'me') === 'me') onMe++;
      if (p.urgency === 'high') high++;
    }
    return { events, pending: pendingArr.length, onMe, high };
  } catch {
    return null;
  }
}
