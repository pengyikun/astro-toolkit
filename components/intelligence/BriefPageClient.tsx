'use client';

import { useState } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import BriefForm from './BriefForm';
import BriefHistory from './BriefHistory';
import BriefResult from './BriefResult';
import { briefResultSchema } from '@/schemas/brief.schema';
import type { Brief } from '@/types';
import type { z } from 'zod';
import {
  ArrowLeft,
  Mail,
  MessageCircle,
  Calendar,
  AlertTriangle,
  Brain,
  ChevronRight,
} from 'lucide-react';

type BriefResultData = z.infer<typeof briefResultSchema>;

function parseResultData(raw: string | null | undefined): BriefResultData | null {
  if (!raw) return null;
  try {
    const parsed = briefResultSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

interface BriefPageClientProps {
  hasMailConfig: boolean;
  hasWhatsAppConfig: boolean;
}

export default function BriefPageClient({ hasMailConfig, hasWhatsAppConfig }: BriefPageClientProps) {
  const { t, formatDate } = useLocale();
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewingBrief, setViewingBrief] = useState<Brief | null>(null);

  if (viewingBrief) {
    const connectorList: string[] = (() => {
      try { return JSON.parse(viewingBrief.connectors); } catch { return []; }
    })();
    const resultData = parseResultData(viewingBrief.result_data);

    return (
      <div className="section-stack">
        {/* Breadcrumb back */}
        <button
          type="button"
          onClick={() => setViewingBrief(null)}
          className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors w-fit"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('common.back')}
        </button>

        {/* Brief metadata header */}
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {connectorList.map((c) => {
                  const isWA = c.toLowerCase().includes('whatsapp');
                  const Icon = isWA ? MessageCircle : Mail;
                  return (
                    <span
                      key={c}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                        isWA
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 ring-blue-500/20'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {isWA ? 'WhatsApp' : 'Email'}
                    </span>
                  );
                })}
              </div>
              <span className="text-ink-muted/40">|</span>
              <div className="inline-flex items-center gap-2 text-sm text-ink-secondary">
                <Calendar className="h-3.5 w-3.5 text-ink-muted" />
                <span className="tabular-nums">{viewingBrief.date_from}</span>
                <ChevronRight className="h-3 w-3 text-ink-muted" />
                <span className="tabular-nums">{viewingBrief.date_to}</span>
              </div>
              <span className="ml-auto text-xs text-ink-muted">
                {formatDate(viewingBrief.created_at, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {viewingBrief.error && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{viewingBrief.error}</span>
              </div>
            )}

            {viewingBrief.thinking && (
              <details className="group mt-4 rounded-lg border border-border bg-surface-secondary/20">
                <summary className="cursor-pointer px-3 py-2 text-xs text-ink-secondary hover:text-ink transition-colors flex items-center gap-2 select-none">
                  <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                  <Brain className="h-3.5 w-3.5 text-ink-muted" />
                  <span className="font-medium">{t('intelligence.thinkingProcess')}</span>
                </summary>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words px-3 py-2 text-xs leading-relaxed text-ink-muted font-mono border-t border-border">
                  {viewingBrief.thinking}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>

        <BriefResult
          summary={viewingBrief.summary}
          pendingItems={viewingBrief.pending_items}
          resultData={resultData}
          briefId={viewingBrief.id}
        />
      </div>
    );
  }

  return (
    <div className="section-stack">
      <BriefForm
        hasMailConfig={hasMailConfig}
        hasWhatsAppConfig={hasWhatsAppConfig}
        onBriefComplete={() => setRefreshKey((k) => k + 1)}
      />
      <BriefHistory refreshKey={refreshKey} onViewBrief={setViewingBrief} />
    </div>
  );
}
