'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import BriefResult from './BriefResult';
import { SafeMarkdown } from '@/components/ui/safe-markdown';
import type { BriefConnector } from '@/types';
import type { z } from 'zod';
import type { briefResultSchema } from '@/schemas/brief.schema';
import {
  Brain,
  Database,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';

type BriefResultData = z.infer<typeof briefResultSchema>;

interface BriefStreamProps {
  connectors: BriefConnector[];
  dateFrom: string;
  dateTo: string;
  emailFolders?: string[];
  abortRef: React.MutableRefObject<AbortController | null>;
  onComplete?: () => void;
  onRetry?: () => void;
}

type Stage = 'preparing' | 'gathering' | 'analyzing' | 'complete';

export default function BriefStream({ connectors, dateFrom, dateTo, emailFolders, abortRef, onComplete, onRetry }: BriefStreamProps) {
  const { t } = useLocale();
  const [thinking, setThinking] = useState('');
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState('');
  const [stage, setStage] = useState<Stage>('preparing');
  const [error, setError] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState('');
  const [pendingItems, setPendingItems] = useState('');
  const [resultData, setResultData] = useState<BriefResultData | null>(null);
  const [briefId, setBriefId] = useState<number | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const thinkingRef = useRef<HTMLPreElement>(null);
  const finishedRef = useRef(false);

  const propsRef = useRef({ connectors, dateFrom, dateTo, emailFolders });
  propsRef.current = { connectors, dateFrom, dateTo, emailFolders };

  const abortRefStable = useRef(abortRef);
  abortRefStable.current = abortRef;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    finishedRef.current = false;

    const controller = new AbortController();
    abortRefStable.current.current = controller;

    function finishOnce() {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setProgress('');
      onCompleteRef.current?.();
    }

    let cancelled = false;

    const STALL_TIMEOUT_DATA_MS = 60_000;
    const STALL_TIMEOUT_THINKING_MS = 180_000;
    let stallTimeout: ReturnType<typeof setTimeout> | null = null;
    let currentStallMs = STALL_TIMEOUT_DATA_MS;

    function resetStallTimer(ms?: number) {
      if (stallTimeout) clearTimeout(stallTimeout);
      if (ms !== undefined) currentStallMs = ms;
      stallTimeout = setTimeout(() => {
        const secs = Math.round(currentStallMs / 1000);
        setError(`Connection stalled — no data received for ${secs} seconds`);
        controller.abort('stall');
        finishOnce();
      }, currentStallMs);
    }

    function clearStallTimer() {
      if (stallTimeout) { clearTimeout(stallTimeout); stallTimeout = null; }
    }

    async function runStream() {
      if (cancelled) return;

      const { connectors: c, dateFrom: df, dateTo: dt, emailFolders: ef } = propsRef.current;

      try {
        const res = await fetch('/api/intelligence/brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectors: c, date_from: df, date_to: dt, ...(ef && ef.length > 0 ? { email_folders: ef } : {}) }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }));
          setError(body.error || `HTTP ${res.status}`);
          finishOnce();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError('No response stream');
          finishOnce();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let terminalEvent: 'complete' | 'error' | null = null;
        let inThinking = false;

        resetStallTimer(STALL_TIMEOUT_DATA_MS);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                switch (currentEvent) {
                  case 'thinking':
                    if (!inThinking) {
                      inThinking = true;
                      resetStallTimer(STALL_TIMEOUT_THINKING_MS);
                    } else {
                      resetStallTimer();
                    }
                    setStage('analyzing');
                    setThinking((prev) => prev + (parsed.chunk || ''));
                    break;
                  case 'content':
                    if (inThinking) {
                      inThinking = false;
                      resetStallTimer(STALL_TIMEOUT_DATA_MS);
                    } else {
                      resetStallTimer();
                    }
                    setStage('analyzing');
                    setContent((prev) => prev + (parsed.chunk || ''));
                    break;
                  case 'progress':
                    resetStallTimer();
                    setProgress(parsed.message || '');
                    // Heuristic stage detection from message
                    if (parsed.message) {
                      const msg = parsed.message.toLowerCase();
                      if (msg.includes('analy') || msg.includes('processing batch')) setStage('analyzing');
                      else if (msg.includes('fetch') || msg.includes('list') || msg.includes('read') || msg.includes('gather')) setStage('gathering');
                    }
                    break;
                  case 'complete':
                    terminalEvent = 'complete';
                    clearStallTimer();
                    setStage('complete');
                    setSummary(parsed.summary || '');
                    setPendingItems(parsed.pendingItems || '');
                    if (parsed.resultData) setResultData(parsed.resultData as BriefResultData);
                    if (parsed.briefId) setBriefId(parsed.briefId);
                    setIsComplete(true);
                    finishOnce();
                    break;
                  case 'error':
                    terminalEvent = 'error';
                    clearStallTimer();
                    setError(parsed.message || 'An error occurred');
                    finishOnce();
                    break;
                  default:
                    resetStallTimer();
                    break;
                }
              } catch {
                // skip
              }
            }
          }
        }

        if (!controller.signal.aborted && !terminalEvent) {
          setError('Connection closed before brief completed');
        }
        finishOnce();
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Stream failed');
        finishOnce();
      } finally {
        clearStallTimer();
      }
    }

    const startHandle = requestIdleCallback?.(() => runStream())
      ?? setTimeout(runStream, 0);

    return () => {
      cancelled = true;
      if (typeof startHandle === 'number') {
        cancelIdleCallback?.(startHandle) ?? clearTimeout(startHandle);
      }
      controller.abort();
      clearStallTimer();
    };
  }, []);

  // Auto-scroll thinking
  useEffect(() => {
    if (thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinking]);

  return (
    <div className="space-y-4">
      {/* Stage tracker */}
      {!isComplete && !error && (
        <Card className="overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-300">
          <CardContent className="p-4 sm:p-5">
            <StageTracker stage={stage} />
            <div className="mt-3 min-h-[1rem]">
              {progress && (
                <p
                  key={progress}
                  className="text-xs text-ink-secondary truncate animate-in fade-in-0 slide-in-from-bottom-1 duration-300"
                >
                  {progress}
                </p>
              )}
            </div>
          </CardContent>
          {/* Indeterminate shimmer bar */}
          <div className="brief-shimmer-track h-0.5 w-full" aria-hidden="true" />
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/[0.02] animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink">Brief generation failed</p>
                <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{error}</p>
              </div>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand/80 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  {t('common.retry')}
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thinking — collapsible */}
      {thinking && !error && (
        <details
          open={showThinking}
          onToggle={(e) => setShowThinking((e.target as HTMLDetailsElement).open)}
          className="group rounded-lg border border-border bg-surface-secondary/20 transition-colors hover:bg-surface-secondary/30 animate-in fade-in-0 duration-300"
        >
          <summary className="cursor-pointer px-3 py-2 text-xs text-ink-secondary hover:text-ink transition-colors flex items-center gap-2 select-none">
            <ChevronRight className="h-3 w-3 transition-transform duration-200 group-open:rotate-90" />
            <Brain className="h-3.5 w-3.5 text-ink-muted" />
            <span className="font-medium">{t('intelligence.thinkingProcess')}</span>
            {!isComplete && (
              <span className="ml-auto inline-flex items-center gap-1 text-ink-muted">
                <span className="h-1 w-1 rounded-full bg-brand animate-pulse" />
                <span className="text-[10px]">{t('intelligence.generatingContent')}</span>
              </span>
            )}
          </summary>
          <pre
            ref={thinkingRef}
            className="max-h-64 overflow-auto whitespace-pre-wrap break-words px-3 py-2 text-xs leading-relaxed text-ink-muted font-mono border-t border-border"
          >
            {thinking}
            {!isComplete && <span className="inline-block w-1.5 h-3 bg-ink-muted/50 animate-pulse ml-0.5" />}
          </pre>
        </details>
      )}

      {/* Result */}
      {isComplete && (
        <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
          <BriefResult
            summary={summary}
            pendingItems={pendingItems}
            resultData={resultData}
            briefId={briefId ?? undefined}
          />
        </div>
      )}

      {/* Raw content streaming (when no structured result yet) */}
      {content && !isComplete && !error && (
        <Card className="animate-in fade-in-0 duration-300">
          <CardContent className="p-4 sm:p-5">
            <div className="text-sm leading-relaxed text-ink">
              <SafeMarkdown content={content} />
              <span className="inline-block w-1.5 h-4 bg-brand/60 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Stage tracker ──────────────────────────────────────────────────────

function StageTracker({ stage }: { stage: Stage }) {
  const { t } = useLocale();
  const stages: Array<{ key: Stage; label: string; Icon: typeof Database }> = [
    { key: 'preparing', label: t('intelligence.stage.preparing'), Icon: Sparkles },
    { key: 'gathering', label: t('intelligence.stage.gathering'), Icon: Database },
    { key: 'analyzing', label: t('intelligence.stage.analyzing'), Icon: Brain },
    { key: 'complete', label: t('intelligence.stage.complete'), Icon: CheckCircle2 },
  ];

  const currentIndex = stages.findIndex((s) => s.key === stage);

  return (
    <div className="flex items-center gap-1 sm:gap-2 w-full">
      {stages.map(({ key, label, Icon }, i) => {
        const isCurrent = i === currentIndex;
        const isDone = i < currentIndex;

        return (
          <div key={key} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 scale-100'
                    : isCurrent
                      ? 'bg-brand/10 text-brand ring-2 ring-brand/20 brief-stage-active scale-105'
                      : 'bg-surface-secondary text-ink-muted scale-95'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 animate-in zoom-in-50 duration-300" />
                ) : isCurrent ? (
                  <Icon className="h-3.5 w-3.5 animate-in zoom-in-50 duration-200" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span
                className={`text-xs whitespace-nowrap hidden sm:inline transition-colors duration-200 ${
                  isCurrent
                    ? 'font-medium text-ink'
                    : isDone
                      ? 'text-ink-secondary'
                      : 'text-ink-muted'
                }`}
              >
                {label}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div className="flex-1 h-px mx-2 bg-border relative overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 transition-[width] duration-500 ease-out ${
                    isDone
                      ? 'w-full bg-emerald-500/50'
                      : isCurrent
                        ? 'w-1/2 bg-gradient-to-r from-brand/50 to-transparent'
                        : 'w-0'
                  }`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
