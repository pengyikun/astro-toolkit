'use client';

import { useState, useRef, useCallback } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { validateBrief } from '@/actions/intelligence';
import BriefStream from './BriefStream';
import type { BriefConnector } from '@/types';

interface BriefFormProps {
  hasMailConfig: boolean;
  hasWhatsAppConfig: boolean;
  onBriefComplete?: () => void;
}

export default function BriefForm({ hasMailConfig, hasWhatsAppConfig, onBriefComplete }: BriefFormProps) {
  const { t } = useLocale();
  const [connectors, setConnectors] = useState<BriefConnector[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [showStream, setShowStream] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const toggleConnector = (c: BriefConnector) => {
    setConnectors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (connectors.length === 0) {
      setError(t('intelligence.selectConnector'));
      return;
    }
    if (!dateFrom || !dateTo) {
      setError(t('intelligence.selectDateRange'));
      return;
    }

    // Validate prerequisites
    const validation = await validateBrief(connectors);
    if (!validation.valid) {
      setError(validation.error || 'Validation failed');
      return;
    }

    setIsRunning(true);
    setShowStream(true);
    setStreamKey((k) => k + 1);
  }, [connectors, dateFrom, dateTo, t]);

  const handleStreamComplete = useCallback(() => {
    setIsRunning(false);
    onBriefComplete?.();
  }, [onBriefComplete]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      <section className="section-block">
        <div className="section-head">
          <h2 className="console-section-title">{t('intelligence.generateBrief')}</h2>
        </div>
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="mb-4">
              <p className="text-sm leading-6 text-ink-secondary">{t('intelligence.briefDescription')}</p>
            </div>

            {error && (
              <div className="console-notice danger mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Connectors */}
              <div>
                <label className="mb-2 block text-sm font-medium text-ink">{t('intelligence.connectors')}</label>
                <div className="flex flex-wrap gap-3">
                  <label className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${connectors.includes('email') ? 'border-brand bg-brand/5 text-ink' : 'border-border text-ink-secondary'} ${!hasMailConfig ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={connectors.includes('email')}
                      onChange={() => toggleConnector('email')}
                      disabled={!hasMailConfig || isRunning}
                      className="accent-brand"
                    />
                    {t('intelligence.emailConnector')}
                    {!hasMailConfig && <span className="text-xs text-ink-muted">({t('intelligence.notConfigured')})</span>}
                  </label>
                  <label className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${connectors.includes('whatsapp') ? 'border-brand bg-brand/5 text-ink' : 'border-border text-ink-secondary'} ${!hasWhatsAppConfig ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      checked={connectors.includes('whatsapp')}
                      onChange={() => toggleConnector('whatsapp')}
                      disabled={!hasWhatsAppConfig || isRunning}
                      className="accent-brand"
                    />
                    {t('intelligence.whatsappConnector')}
                    {!hasWhatsAppConfig && <span className="text-xs text-ink-muted">({t('intelligence.notConfigured')})</span>}
                  </label>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="brief_date_from" className="mb-1.5 block text-sm font-medium text-ink">
                    {t('intelligence.dateFrom')}
                  </label>
                  <input
                    id="brief_date_from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    disabled={isRunning}
                    className="console-input w-full"
                  />
                </div>
                <div>
                  <label htmlFor="brief_date_to" className="mb-1.5 block text-sm font-medium text-ink">
                    {t('intelligence.dateTo')}
                  </label>
                  <input
                    id="brief_date_to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    disabled={isRunning}
                    className="console-input w-full"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" disabled={isRunning} className={isRunning ? 'opacity-75 cursor-not-allowed' : ''}>
                  {isRunning ? t('intelligence.generating') : t('intelligence.generateBriefBtn')}
                </Button>
                {isRunning && (
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    {t('common.cancel')}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {showStream && (
        <BriefStream
          key={streamKey}
          connectors={connectors}
          dateFrom={dateFrom}
          dateTo={dateTo}
          abortRef={abortRef}
          onComplete={handleStreamComplete}
        />
      )}
    </div>
  );
}
