'use client';

import { useEffect, useState, useRef } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Card, CardContent } from '@/components/ui/card';
import BriefResult from './BriefResult';
import type { BriefConnector } from '@/types';

interface BriefStreamProps {
  connectors: BriefConnector[];
  dateFrom: string;
  dateTo: string;
  emailFolders?: string[];
  abortRef: React.MutableRefObject<AbortController | null>;
  onComplete?: () => void;
  onRetry?: () => void;
}

export default function BriefStream({ connectors, dateFrom, dateTo, emailFolders, abortRef, onComplete, onRetry }: BriefStreamProps) {
  const { t } = useLocale();
  const [thinking, setThinking] = useState('');
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [summary, setSummary] = useState('');
  const [pendingItems, setPendingItems] = useState('');
  const [showThinking, setShowThinking] = useState(true);
  const thinkingRef = useRef<HTMLPreElement>(null);
  const finishedRef = useRef(false);

  // Store props and callbacks in refs so the mount-only effect always
  // reads the latest values without needing them as dependencies.
  const propsRef = useRef({ connectors, dateFrom, dateTo, emailFolders });
  propsRef.current = { connectors, dateFrom, dateTo, emailFolders };

  const abortRefStable = useRef(abortRef);
  abortRefStable.current = abortRef;

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Mount-only effect — lifecycle is controlled by the parent via `key={streamKey}`.
  // The fetch is deferred by a microtask so React StrictMode's immediate
  // cleanup (setup → cleanup → setup) aborts before the request is sent,
  // preventing the ghost cancelled request in development.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    finishedRef.current = false;

    const controller = new AbortController();
    abortRefStable.current.current = controller;

    function finishOnce() {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setHasEnded(true);
      setProgress('');
      onCompleteRef.current?.();
    }

    let cancelled = false;

    // Stall detection: 60s for data phases, 180s during LLM thinking
    // (extended thinking models like Claude can deliberate for minutes).
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
      // Bail out immediately if StrictMode cleanup already ran
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
                    setThinking((prev) => prev + (parsed.chunk || ''));
                    break;
                  case 'content':
                    if (inThinking) {
                      inThinking = false;
                      resetStallTimer(STALL_TIMEOUT_DATA_MS);
                    } else {
                      resetStallTimer();
                    }
                    setContent((prev) => prev + (parsed.chunk || ''));
                    break;
                  case 'progress':
                    resetStallTimer();
                    setProgress(parsed.message || '');
                    break;
                  case 'complete':
                    terminalEvent = 'complete';
                    clearStallTimer();
                    setSummary(parsed.summary || '');
                    setPendingItems(parsed.pendingItems || '');
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

    // Defer the fetch start so StrictMode's synchronous cleanup sets
    // `cancelled = true` before the request is actually dispatched.
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
      {/* Progress */}
      {progress && !isComplete && !error && !hasEnded && (
        <div className="flex items-center gap-2 text-sm text-ink-secondary">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          {progress}
        </div>
      )}

      {/* Thinking process */}
      {thinking && (
        <section className="section-block">
          <div className="section-head flex items-center justify-between">
            <h2 className="console-section-title">{t('intelligence.thinkingProcess')}</h2>
            <button
              type="button"
              onClick={() => setShowThinking(!showThinking)}
              className="text-xs text-ink-secondary hover:text-ink transition-colors"
            >
              {showThinking ? t('intelligence.hideThinking') : t('intelligence.showThinking')}
            </button>
          </div>
          {showThinking && (
            <Card>
              <CardContent className="p-0">
                <pre
                  ref={thinkingRef}
                  className="max-h-64 overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-relaxed text-ink-secondary font-mono bg-surface-secondary/50 rounded-lg"
                >
                  {thinking}
                  {!isComplete && <span className="inline-block w-1.5 h-3.5 bg-ink-secondary/50 animate-pulse ml-0.5" />}
                </pre>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* Error */}
      {error && (
        <div className="console-notice danger flex items-center justify-between gap-3">
          <span>{error}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="shrink-0 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand/90 transition-colors"
            >
              {t('common.retry')}
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {isComplete && (
        <BriefResult summary={summary} pendingItems={pendingItems} />
      )}

      {/* Raw content streaming (while not yet complete) */}
      {content && !isComplete && (
        <section className="section-block">
          <div className="section-head">
            <h2 className="console-section-title">{t('intelligence.generatingContent')}</h2>
          </div>
          <Card>
            <CardContent className="p-4">
              <div className="prose prose-sm max-w-none text-ink whitespace-pre-wrap">
                {content}
                <span className="inline-block w-1.5 h-3.5 bg-brand animate-pulse ml-0.5" />
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
