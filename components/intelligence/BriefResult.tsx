'use client';

import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';

interface BriefResultProps {
  summary: string;
  pendingItems: string;
}

export default function BriefResult({ summary, pendingItems }: BriefResultProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      {/* Summary */}
      <section className="section-block">
        <div className="section-head">
          <h2 className="console-section-title">{t('intelligence.summary')}</h2>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-5">
            {summary ? (
              <div className="space-y-2">
                {summary.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
                    <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
                    <span>{line.replace(/^[-•*]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-muted">{t('intelligence.noSummary')}</p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Pending Items */}
      {(pendingItems || !summary) && (
        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t('intelligence.pendingItems')}</h2>
          </div>
          <Card>
            <CardContent className="p-4 sm:p-5">
              {pendingItems ? (
                <div className="space-y-2">
                  {pendingItems.split('\n').filter(Boolean).map((line, i) => {
                    const cleaned = line.replace(/^[-•*]\s*/, '');
                    let dotColor = 'bg-green-500';
                    if (cleaned.includes('[HIGH]')) dotColor = 'bg-red-500';
                    else if (cleaned.includes('[MEDIUM]')) dotColor = 'bg-yellow-500';

                    return (
                      <div key={i} className="flex gap-3 text-sm leading-relaxed text-ink">
                        <span className={`shrink-0 mt-1.5 h-2 w-2 rounded-full ${dotColor}`} />
                        <span>{cleaned.replace(/\[HIGH\]|\[MEDIUM\]|\[LOW\]/g, '').replace(/\*\*\[([^\]]*)\]\*\*/g, '[$1]').trim()}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-ink-muted">{t('intelligence.noPendingItems')}</p>
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
