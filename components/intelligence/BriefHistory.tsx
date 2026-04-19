'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getBriefHistory, getBriefDetail, deleteBrief } from '@/actions/intelligence';
import BriefResult from './BriefResult';
import type { Brief } from '@/types';

interface BriefHistoryProps {
  refreshKey?: number;
}

export default function BriefHistory({ refreshKey }: BriefHistoryProps) {
  const { t, formatDate } = useLocale();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedBrief, setExpandedBrief] = useState<Brief | null>(null);
  const [isLoading, startLoadTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const requestedIdRef = useRef<number | null>(null);

  useEffect(() => {
    startLoadTransition(async () => {
      const data = await getBriefHistory();
      setBriefs(data);
    });
  }, [refreshKey]);

  const handleExpand = (id: number) => {
    if (expandedId === id) {
      requestedIdRef.current = null;
      setExpandedId(null);
      setExpandedBrief(null);
      return;
    }

    requestedIdRef.current = id;
    setExpandedId(id);
    setExpandedBrief(null);
    startLoadTransition(async () => {
      const detail = await getBriefDetail(id);
      if (requestedIdRef.current !== id) return;
      setExpandedBrief(detail);
    });
  };

  const handleDelete = (id: number) => {
    const formData = new FormData();
    formData.set('id', String(id));

    startDeleteTransition(async () => {
      await deleteBrief(formData);
      setBriefs((prev) => prev.filter((b) => b.id !== id));
      if (expandedId === id) {
        setExpandedId(null);
        setExpandedBrief(null);
      }
    });
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      running: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.pending}`}>
        {status}
      </span>
    );
  };

  return (
    <section className="section-block">
      <div className="section-head">
        <h2 className="console-section-title">{t('intelligence.history')}</h2>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-5">
          {isLoading && briefs.length === 0 ? (
            <p className="text-sm text-ink-secondary">{t('common.loading')}</p>
          ) : briefs.length === 0 ? (
            <p className="text-sm text-ink-secondary">{t('intelligence.noHistory')}</p>
          ) : (
            <div className="space-y-2">
              {briefs.map((brief) => {
                const connectorList: string[] = (() => {
                  try { return JSON.parse(brief.connectors); } catch { return []; }
                })();

                return (
                  <div key={brief.id} className="rounded-md border border-border">
                    <button
                      type="button"
                      onClick={() => handleExpand(brief.id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {statusBadge(brief.status)}
                        <span className="text-sm text-ink truncate">
                          {connectorList.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
                        </span>
                        <span className="text-xs text-ink-secondary shrink-0">
                          {brief.date_from} → {brief.date_to}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-ink-muted">
                          {formatDate(brief.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <svg
                          className={`h-4 w-4 text-ink-secondary transition-transform ${expandedId === brief.id ? 'rotate-180' : ''}`}
                          fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {expandedId === brief.id && expandedBrief?.id === brief.id && (
                      <div className="border-t border-border px-4 py-4">
                        {expandedBrief.thinking && (
                          <details className="mb-4">
                            <summary className="cursor-pointer text-xs font-medium text-ink-secondary hover:text-ink">
                              {t('intelligence.thinkingProcess')}
                            </summary>
                            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs text-ink-secondary font-mono bg-surface-secondary/50 rounded p-3">
                              {expandedBrief.thinking}
                            </pre>
                          </details>
                        )}

                        <BriefResult
                          summary={expandedBrief.summary}
                          pendingItems={expandedBrief.pending_items}
                        />

                        {expandedBrief.error && (
                          <div className="console-notice danger mt-4">{expandedBrief.error}</div>
                        )}

                        <div className="mt-4 pt-3 border-t border-border">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(brief.id)}
                            disabled={isDeleting}
                          >
                            {t('common.delete')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
