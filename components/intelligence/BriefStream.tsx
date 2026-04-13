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
  abortRef: React.MutableRefObject<AbortController | null>;
  onComplete?: () => void;
}

export default function BriefStream({ connectors, dateFrom, dateTo, abortRef, onComplete }: BriefStreamProps) {
  const { t } = useLocale();
  const [thinking, setThinking] = useState('');
  const [content, setContent] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [summary, setSummary] = useState('');
  const [pendingItems, setPendingItems] = useState('');
  const [showThinking, setShowThinking] = useState(true);
  const thinkingRef = useRef<HTMLPreElement>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    async function runStream() {
      try {
        const res = await fetch('/api/intelligence/brief', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ connectors, date_from: dateFrom, date_to: dateTo }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }));
          setError(body.error || `HTTP ${res.status}`);
          onComplete?.();
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setError('No response stream');
          onComplete?.();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

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
                    setThinking((prev) => prev + (parsed.chunk || ''));
                    break;
                  case 'content':
                    setContent((prev) => prev + (parsed.chunk || ''));
                    break;
                  case 'progress':
                    setProgress(parsed.message || '');
                    break;
                  case 'complete':
                    setSummary(parsed.summary || '');
                    setPendingItems(parsed.pendingItems || '');
                    setIsComplete(true);
                    onComplete?.();
                    break;
                  case 'error':
                    setError(parsed.message || 'An error occurred');
                    onComplete?.();
                    break;
                }
              } catch {
                // skip
              }
            }
          }
        }

        if (!isComplete) {
          onComplete?.();
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Stream failed');
        onComplete?.();
      }
    }

    runStream();

    return () => {
      controller.abort();
    };
  }, [connectors, dateFrom, dateTo, abortRef, onComplete]);

  // Auto-scroll thinking
  useEffect(() => {
    if (thinkingRef.current) {
      thinkingRef.current.scrollTop = thinkingRef.current.scrollHeight;
    }
  }, [thinking]);

  return (
    <div className="space-y-4">
      {/* Progress */}
      {progress && !isComplete && (
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
        <div className="console-notice danger">{error}</div>
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
