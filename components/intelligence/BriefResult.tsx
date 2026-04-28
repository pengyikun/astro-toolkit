'use client';

import { useState } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createTodosFromBrief } from '@/actions/intelligence';
import { Copy, Check, ListChecks } from 'lucide-react';

interface BriefResultProps {
  summary: string;
  pendingItems: string;
  briefId?: number;
}

export default function BriefResult({ summary, pendingItems, briefId }: BriefResultProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-4">
      {/* Summary */}
      <section className="section-block">
        <div className="section-head flex items-center justify-between">
          <h2 className="console-section-title">{t('intelligence.summary')}</h2>
          {summary && <CopyTextButton text={summary} />}
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
          <div className="section-head flex items-center justify-between">
            <h2 className="console-section-title">{t('intelligence.pendingItems')}</h2>
            {pendingItems && <CopyTextButton text={pendingItems} />}
          </div>
          <Card>
            <CardContent className="p-4 sm:p-5">
              {pendingItems ? (
                <div className="space-y-2">
                  {pendingItems.split('\n').filter(Boolean).map((line, i) => {
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
              ) : (
                <p className="text-sm text-ink-muted">{t('intelligence.noPendingItems')}</p>
              )}
              {pendingItems && briefId && (
                <CreateTodosButton briefId={briefId} />
              )}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

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
      className="text-ink-muted hover:text-ink-secondary transition-colors p-1"
      aria-label="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
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
      <p className="mt-3 text-xs text-green-600 flex items-center gap-1.5">
        <ListChecks className="h-3.5 w-3.5" />
        {t('intelligence.todosCreated')}
      </p>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border">
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
        <p className="mt-1 text-xs text-red-500">{t('intelligence.createTodosError')}</p>
      )}
    </div>
  );
}
