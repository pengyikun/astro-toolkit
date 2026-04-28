'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { validateBrief, fetchBriefFolders } from '@/actions/intelligence';
import BriefStream from './BriefStream';
import type { BriefConnector, MailFolder } from '@/types';
import {
  Mail,
  MessageCircle,
  Sparkles,
  ChevronDown,
  Folder,
  Calendar,
  AlertCircle,
  X,
  Check,
} from 'lucide-react';

interface BriefFormProps {
  hasMailConfig: boolean;
  hasWhatsAppConfig: boolean;
  onBriefComplete?: () => void;
}

type PresetKey = 'today' | 'last7' | 'last14' | 'last30' | 'custom';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function BriefForm({ hasMailConfig, hasWhatsAppConfig, onBriefComplete }: BriefFormProps) {
  const { t } = useLocale();
  const [connectors, setConnectors] = useState<BriefConnector[]>(() => {
    const def: BriefConnector[] = [];
    if (hasMailConfig) def.push('email');
    if (hasWhatsAppConfig) def.push('whatsapp');
    return def;
  });
  const [preset, setPreset] = useState<PresetKey>('last7');
  const [dateFrom, setDateFrom] = useState(() => isoDaysAgo(7));
  const [dateTo, setDateTo] = useState(() => todayIso());
  const [error, setError] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [showStream, setShowStream] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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

  const handlePreset = (p: PresetKey) => {
    setPreset(p);
    if (p === 'today') {
      const today = todayIso();
      setDateFrom(today);
      setDateTo(today);
    } else if (p === 'last7') {
      setDateFrom(isoDaysAgo(7));
      setDateTo(todayIso());
    } else if (p === 'last14') {
      setDateFrom(isoDaysAgo(14));
      setDateTo(todayIso());
    } else if (p === 'last30') {
      setDateFrom(isoDaysAgo(30));
      setDateTo(todayIso());
    }
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
  const dayCount = useMemo(() => {
    if (!dateFrom || !dateTo) return 0;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Composer header */}
          <div className="px-4 sm:px-5 py-3 border-b border-border bg-surface-secondary/30 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-ink leading-tight">{t('intelligence.compose.title')}</h2>
              <p className="text-xs text-ink-muted leading-tight mt-0.5">{t('intelligence.compose.subtitle')}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-5">
            {/* Sources */}
            <div className="space-y-2">
              <Label icon={<Mail className="h-3.5 w-3.5" />} text={t('intelligence.connectors')} />
              <div className="flex flex-wrap gap-2">
                <SourceTile
                  active={connectors.includes('email')}
                  configured={hasMailConfig}
                  disabled={isRunning}
                  icon={<Mail className="h-4 w-4" />}
                  label={t('intelligence.emailConnector')}
                  notConfiguredText={t('intelligence.notConfigured')}
                  onClick={() => toggleConnector('email')}
                />
                <SourceTile
                  active={connectors.includes('whatsapp')}
                  configured={hasWhatsAppConfig}
                  disabled={isRunning}
                  icon={<MessageCircle className="h-4 w-4" />}
                  label={t('intelligence.whatsappConnector')}
                  notConfiguredText={t('intelligence.notConfigured')}
                  onClick={() => toggleConnector('whatsapp')}
                />
              </div>
            </div>

            {/* Date range */}
            <div className="space-y-2">
              <Label icon={<Calendar className="h-3.5 w-3.5" />} text={t('intelligence.dateFrom') + ' / ' + t('intelligence.dateTo')} />
              <div className="flex flex-wrap items-center gap-1 rounded-md border border-border p-0.5 w-fit">
                {(['today', 'last7', 'last14', 'last30', 'custom'] as PresetKey[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePreset(p)}
                    disabled={isRunning}
                    className={`px-2.5 h-7 text-xs rounded transition-colors ${
                      preset === p
                        ? 'bg-surface-secondary text-ink font-medium'
                        : 'text-ink-muted hover:text-ink-secondary'
                    }`}
                  >
                    {t(`intelligence.preset.${p}`)}
                  </button>
                ))}
              </div>
              {preset === 'custom' && (
                <div className="flex items-center gap-3 pt-1">
                  <input
                    id="brief_date_from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    disabled={isRunning}
                    className="console-input text-sm flex-1 min-w-0"
                  />
                  <span className="text-xs text-ink-muted">→</span>
                  <input
                    id="brief_date_to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    disabled={isRunning}
                    className="console-input text-sm flex-1 min-w-0"
                  />
                </div>
              )}
              <p className="text-[11px] text-ink-muted">
                {dateFrom} → {dateTo} <span className="text-ink-muted/60">·</span> {dayCount} {dayCount === 1 ? 'day' : 'days'}
              </p>
            </div>

            {/* Advanced (folders) */}
            {emailSelected && hasMailConfig && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-secondary transition-colors"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAdvanced ? '' : '-rotate-90'}`} />
                  {showAdvanced ? t('intelligence.advancedHide') : t('intelligence.advanced')}
                  {foldersLoaded && (
                    <span className="text-ink-muted/70">
                      · {selectedFolders.length}/{availableFolders.length}
                    </span>
                  )}
                </button>
                {showAdvanced && (
                  <div className="mt-3 pl-4 border-l-2 border-border">
                    <Label icon={<Folder className="h-3.5 w-3.5" />} text={t('intelligence.emailFolders')} />
                    {!foldersLoaded ? (
                      <button
                        type="button"
                        onClick={handleLoadFolders}
                        disabled={loadingFolders || isRunning}
                        className="mt-2 text-xs text-brand hover:text-brand/80 transition-colors font-medium"
                      >
                        {loadingFolders ? t('intelligence.loadingFolders') : t('intelligence.loadFolders')}
                      </button>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-ink-secondary">
                            {selectedFolders.length} {t('intelligence.foldersSelected')}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedFolders(availableFolders.map((f) => f.name))}
                            disabled={isRunning}
                            className="text-brand hover:text-brand/80"
                          >
                            {t('intelligence.selectAll')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedFolders([])}
                            disabled={isRunning}
                            className="text-brand hover:text-brand/80"
                          >
                            {t('intelligence.deselectAll')}
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {availableFolders.map((folder) => {
                            const isSelected = selectedFolders.includes(folder.name);
                            return (
                              <button
                                key={folder.name}
                                type="button"
                                onClick={() => toggleFolder(folder.name)}
                                disabled={isRunning}
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs border transition-colors ${
                                  isSelected
                                    ? 'border-brand/40 bg-brand/10 text-brand'
                                    : 'border-border text-ink-muted hover:border-ink-muted'
                                }`}
                              >
                                {isSelected && <Check className="h-3 w-3" />}
                                {folder.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-700 dark:text-red-400">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="ml-auto text-red-700/60 hover:text-red-700"
                  aria-label="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={isRunning || connectors.length === 0}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
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

      {/* Stream renders directly below */}
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

function Label({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-ink-muted">
      {icon}
      {text}
    </div>
  );
}

function SourceTile({
  active,
  configured,
  disabled,
  icon,
  label,
  notConfiguredText,
  onClick,
}: {
  active: boolean;
  configured: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  notConfiguredText: string;
  onClick: () => void;
}) {
  const isDisabled = !configured || disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`group relative inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-all ${
        active
          ? 'border-brand bg-brand/10 text-brand shadow-sm'
          : 'border-border text-ink-secondary hover:border-ink-muted hover:bg-surface-secondary/30'
      } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={active ? 'text-brand' : 'text-ink-muted'}>{icon}</span>
      <span className="font-medium">{label}</span>
      {!configured && (
        <span className="text-[10px] uppercase tracking-wide text-ink-muted/80 ml-1">
          · {notConfiguredText}
        </span>
      )}
      {active && (
        <Check className="h-3.5 w-3.5 ml-1" />
      )}
    </button>
  );
}
