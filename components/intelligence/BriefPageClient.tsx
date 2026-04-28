'use client';

import { useState } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import BriefForm from './BriefForm';
import BriefHistory from './BriefHistory';
import BriefResult from './BriefResult';
import type { Brief } from '@/types';

interface BriefPageClientProps {
  hasMailConfig: boolean;
  hasWhatsAppConfig: boolean;
}

export default function BriefPageClient({ hasMailConfig, hasWhatsAppConfig }: BriefPageClientProps) {
  const { t } = useLocale();
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewingBrief, setViewingBrief] = useState<Brief | null>(null);

  return (
    <div className="section-stack">
      {viewingBrief ? (
        <>
          <button
            type="button"
            onClick={() => setViewingBrief(null)}
            className="text-sm text-ink-secondary hover:text-ink transition-colors flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            {t('common.back')}
          </button>

          <section className="section-block">
            <Card>
              <CardContent className="p-4 sm:p-5 space-y-4">
                <p className="text-xs text-ink-muted">
                  {(() => { try { return JSON.parse(viewingBrief.connectors).map((c: string) => c.charAt(0).toUpperCase() + c.slice(1)).join(', '); } catch { return ''; } })()}
                  {' · '}
                  {viewingBrief.date_from} → {viewingBrief.date_to}
                </p>
                {viewingBrief.thinking && (
                  <details className="group">
                    <summary className="cursor-pointer text-xs text-ink-muted hover:text-ink-secondary transition-colors flex items-center gap-1.5">
                      <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" /></svg>
                      {t('intelligence.thinkingProcess')}
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-ink-muted font-mono rounded-md bg-surface-secondary/40 p-3">
                      {viewingBrief.thinking}
                    </pre>
                  </details>
                )}
                {viewingBrief.error && (
                  <div className="console-notice danger">{viewingBrief.error}</div>
                )}
              </CardContent>
            </Card>
          </section>

          <BriefResult summary={viewingBrief.summary} pendingItems={viewingBrief.pending_items} briefId={viewingBrief.id} />
        </>
      ) : (
        <>
          <BriefForm
            hasMailConfig={hasMailConfig}
            hasWhatsAppConfig={hasWhatsAppConfig}
            onBriefComplete={() => setRefreshKey((k) => k + 1)}
          />
          <BriefHistory refreshKey={refreshKey} onViewBrief={setViewingBrief} />
        </>
      )}
    </div>
  );
}
