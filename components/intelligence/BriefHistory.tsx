'use client';

import { useState, useEffect, useTransition } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { getBriefHistory, getBriefDetail, deleteBrief } from '@/actions/intelligence';
import type { Brief } from '@/types';

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
    return <p className="text-sm text-ink-muted">{t('common.loading')}</p>;
  }

  if (briefs.length === 0) return null;

  return (
    <section className="section-block">
      <div className="section-head">
        <h2 className="console-section-title">{t('intelligence.history')}</h2>
      </div>
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="space-y-1">
            {briefs.map((brief) => {
          const connectorList: string[] = (() => { try { return JSON.parse(brief.connectors); } catch { return []; } })();
          const statusDot = brief.status === 'completed' ? 'bg-green-500' : brief.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500';

          return (
            <div
              key={brief.id}
              onClick={() => handleView(brief.id)}
              className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 -mx-3 cursor-pointer hover:bg-surface-secondary/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${statusDot}`} />
                <span className="text-sm text-ink truncate">
                  {connectorList.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(', ')}
                </span>
                <span className="text-xs text-ink-muted shrink-0">{brief.date_from} → {brief.date_to}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {loadingId === brief.id && <div className="h-3 w-3 animate-spin rounded-full border border-brand border-t-transparent" />}
                <span className="text-xs text-ink-muted">
                  {formatDate(brief.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, brief.id)}
                  disabled={isDeleting}
                  className="opacity-0 group-hover:opacity-100 text-xs text-ink-muted hover:text-red-500 transition-all"
                  aria-label="Delete"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
          );
        })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
