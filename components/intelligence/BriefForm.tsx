'use client';

import { useState, useRef, useCallback } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { validateBrief, fetchBriefFolders } from '@/actions/intelligence';
import BriefStream from './BriefStream';
import type { BriefConnector, MailFolder } from '@/types';

interface BriefFormProps {
  hasMailConfig: boolean;
  hasWhatsAppConfig: boolean;
  onBriefComplete?: () => void;
}

export default function BriefForm({ hasMailConfig, hasWhatsAppConfig, onBriefComplete }: BriefFormProps) {
  const { t } = useLocale();
  const [connectors, setConnectors] = useState<BriefConnector[]>([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [showStream, setShowStream] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Folder selection state
  const [availableFolders, setAvailableFolders] = useState<MailFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);

  const toggleConnector = (c: BriefConnector) => {
    setConnectors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    );
  };

  const handleLoadFolders = useCallback(async () => {
    setLoadingFolders(true);
    setError('');
    try {
      const result = await fetchBriefFolders();
      if (result.error) {
        setError(result.error);
      } else {
        setAvailableFolders(result.folders);
        setSelectedFolders(result.folders.map((f) => f.name));
        setFoldersLoaded(true);
      }
    } catch {
      setError(t('intelligence.loadFoldersError'));
    } finally {
      setLoadingFolders(false);
    }
  }, [t]);

  const toggleFolder = (name: string) => {
    setSelectedFolders((prev) =>
      prev.includes(name) ? prev.filter((f) => f !== name) : [...prev, name],
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
    if (connectors.includes('email') && foldersLoaded && selectedFolders.length === 0) {
      setError(t('intelligence.noFoldersSelected'));
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
  }, [connectors, dateFrom, dateTo, foldersLoaded, selectedFolders, t]);

  const handleStreamComplete = useCallback(() => {
    setIsRunning(false);
    onBriefComplete?.();
  }, [onBriefComplete]);

  const handleRetry = useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(true);
    setShowStream(true);
    setStreamKey((k) => k + 1);
  }, []);

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsRunning(false);
  };

  const emailSelected = connectors.includes('email');

  return (
    <div className="space-y-6">
      {/* Compact form area */}
      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
          {/* Connectors as chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide">{t('intelligence.connectors')}</span>
            <button type="button" onClick={() => toggleConnector('email')} disabled={!hasMailConfig || isRunning}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${connectors.includes('email') ? 'border-brand bg-brand/10 text-brand' : 'border-border text-ink-secondary hover:border-ink-muted'} ${!hasMailConfig ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              {t('intelligence.emailConnector')}
              {!hasMailConfig && <span className="text-ink-muted">·</span>}
              {!hasMailConfig && <span>{t('intelligence.notConfigured')}</span>}
            </button>
            <button type="button" onClick={() => toggleConnector('whatsapp')} disabled={!hasWhatsAppConfig || isRunning}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${connectors.includes('whatsapp') ? 'border-brand bg-brand/10 text-brand' : 'border-border text-ink-secondary hover:border-ink-muted'} ${!hasWhatsAppConfig ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}>
              {t('intelligence.whatsappConnector')}
              {!hasWhatsAppConfig && <span className="text-ink-muted">·</span>}
              {!hasWhatsAppConfig && <span>{t('intelligence.notConfigured')}</span>}
            </button>
          </div>

          {/* Email Folder Selection - compact */}
          {emailSelected && hasMailConfig && (
            <div>
              {!foldersLoaded ? (
                <button type="button" onClick={handleLoadFolders} disabled={loadingFolders || isRunning}
                  className="text-xs text-brand hover:text-brand/80 transition-colors font-medium">
                  {loadingFolders ? t('intelligence.loadingFolders') : t('intelligence.loadFolders')}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-ink-secondary">{selectedFolders.length} {t('intelligence.foldersSelected')}</span>
                    <button type="button" onClick={() => setSelectedFolders(availableFolders.map((f) => f.name))} disabled={isRunning} className="text-xs text-brand hover:text-brand/80">{t('intelligence.selectAll')}</button>
                    <button type="button" onClick={() => setSelectedFolders([])} disabled={isRunning} className="text-xs text-brand hover:text-brand/80">{t('intelligence.deselectAll')}</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {availableFolders.map((folder) => (
                      <button key={folder.name} type="button" onClick={() => toggleFolder(folder.name)} disabled={isRunning}
                        className={`rounded-full px-2.5 py-0.5 text-xs border transition-colors ${selectedFolders.includes(folder.name) ? 'border-brand/30 bg-brand/5 text-ink' : 'border-border text-ink-muted hover:border-ink-muted'}`}>
                        {folder.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date range inline */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <label htmlFor="brief_date_from" className="text-xs text-ink-muted shrink-0">{t('intelligence.dateFrom')}</label>
              <input id="brief_date_from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={isRunning} className="console-input text-sm flex-1 min-w-0" />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label htmlFor="brief_date_to" className="text-xs text-ink-muted shrink-0">{t('intelligence.dateTo')}</label>
              <input id="brief_date_to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={isRunning} className="console-input text-sm flex-1 min-w-0" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={isRunning}>
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

      {/* Stream renders directly below, no wrapping */}
      {showStream && (
        <BriefStream
          key={streamKey}
          connectors={connectors}
          dateFrom={dateFrom}
          dateTo={dateTo}
          emailFolders={foldersLoaded ? selectedFolders : undefined}
          abortRef={abortRef}
          onComplete={handleStreamComplete}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}
