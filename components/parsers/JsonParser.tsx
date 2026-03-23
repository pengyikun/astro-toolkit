'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { parseJson, type JsonParseResult } from '@/lib/json-parser';
import { copyToClipboard } from '@/lib/clipboard';
import { useCodeEditor } from '@/hooks/useCodeEditor';
import { useLocale } from '@/lib/i18n/client';
import { Badge } from '@/components/ui/badge';
import { CheckCircleIcon, ErrorCircleIcon, UploadIcon, VisualizeIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CodeOutput } from '@/components/ui/code-output';
import { showToast } from '@/components/ui/FlashMessage';

const VisualizerOverlay = dynamic(() => import('./VisualizerOverlay'), { ssr: false });

export default function JsonParser() {
  const { t } = useLocale();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<JsonParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [visualizerData, setVisualizerData] = useState<unknown | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formattedBtnRef = useRef<HTMLButtonElement>(null);
  const minifiedBtnRef = useRef<HTMLButtonElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const copyLabels = { prompt: t('parser.copyPrompt'), shown: t('parser.copyShown'), copied: t('parser.copied') };

  useCodeEditor({ value: input, language: 'json', gutterRef, highlightRef, textareaRef });

  const handleParse = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = parseJson(input);
      setResult(parsed);
    } catch (err) {
      setResult({
        valid: false,
        repaired: false,
        original: input,
        error: err instanceof Error ? err.message : t('parser.unexpectedError'),
      });
    }
  }, [input]);

  const handleFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setInput(text);
      setFileName(file.name);
    };
    reader.readAsText(file);
  }, []);

  const handleVisualize = useCallback(() => {
    if (!result?.minified) return;
    try {
      setVisualizerData(JSON.parse(result.minified));
      setIsVisualizerOpen(true);
    } catch {
      showToast('error', t('parser.cannotVisualizeJson'));
    }
  }, [result, t]);

  useEffect(() => {
    if (!isVisualizerOpen || !visualizerData) return;

    const frame = requestAnimationFrame(() => {
      const canvas = document.getElementById('json-viz-canvas') as HTMLCanvasElement | null;
      if (!canvas) return;

      const initVisualizer = (window as unknown as Record<string, unknown>).initJsonVisualizer;
      if (typeof initVisualizer === 'function') {
        (window as unknown as Record<string, unknown>)._vizCtrl = (
          initVisualizer as (canvas: HTMLCanvasElement, data: unknown) => unknown
        )(canvas, visualizerData);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [isVisualizerOpen, visualizerData]);

  return (
    <>
      <div className={`mt-8 grid grid-cols-1 gap-4 lg:gap-6 ${result ? 'lg:grid-cols-5' : ''}`}>
        <div className={result ? 'lg:col-span-3' : ''}>
          <Card>
            <CardContent className="p-5 sm:p-6">
              <form onSubmit={handleParse}>
                <div className="code-editor">
                  <div className="code-editor-toolbar">
                    <label htmlFor="json-input" className="console-inline-label">{t('parser.jsonInput')}</label>
                    <div className="code-editor-toolbar-actions">
                      <Button variant="outline" size="sm" asChild>
                        <label htmlFor="json-file" className="cursor-pointer">
                          <UploadIcon />
                          {t('parser.upload')}
                        </label>
                      </Button>
                      <input
                        type="file"
                        id="json-file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileLoad}
                      />
                      {fileName ? (
                        <span id="file-name" className="max-w-[16rem] truncate text-sm text-ink-secondary">
                          {fileName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="code-editor-shell" data-code-editor>
                    <div className="code-editor-gutter" ref={gutterRef} aria-hidden="true"></div>
                    <div className="code-editor-stage">
                      <pre className="code-editor-highlight" ref={highlightRef} aria-hidden="true"></pre>
                      <textarea
                        name="input"
                        id="json-input"
                        ref={textareaRef}
                        rows={16}
                        placeholder='{"name": "test", "value": 123}'
                        className="code-editor-input"
                        data-language="json"
                        spellCheck={false}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button type="submit">{t('parser.parseAndValidate')}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {result && (
          <div className="lg:col-span-2">
            {result.valid ? (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="parser-card-header">
                    <div className="flex flex-wrap items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-success">{t('parser.validJson')}</span>
                      {result.repaired && (
                        <Badge variant="warning" className="gap-1.5">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743" />
                          </svg>
                          {t('parser.repaired')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {result.stats && (
                    <div className="parser-card-section parser-card-section-muted">
                      <div className="console-stats-grid">
                        <div className="console-stats-row"><span>{t('parser.keys')}</span><strong>{result.stats.keys}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.depth')}</span><strong>{result.stats.depth}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.objects')}</span><strong>{result.stats.objectCount}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.arrays')}</span><strong>{result.stats.arrayCount}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.strings')}</span><strong>{result.stats.stringCount}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.numbers')}</span><strong>{result.stats.numberCount}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.size')}</span><strong>{result.stats.size} B</strong></div>
                      </div>
                    </div>
                  )}

                  <div className="parser-card-section">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="console-inline-label">{t('parser.formatted')}</span>
                      <button
                        type="button"
                        ref={formattedBtnRef}
                        onClick={() => copyToClipboard(result.formatted ?? '', formattedBtnRef.current, copyLabels)}
                        className="console-text-action"
                      >
                        {t('parser.copy')}
                      </button>
                    </div>
                    <CodeOutput id="formatted-output" className="max-h-80">{result.formatted}</CodeOutput>
                  </div>

                  <div className="parser-card-section">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="console-inline-label">{t('parser.minified')}</span>
                      <button
                        type="button"
                        ref={minifiedBtnRef}
                        onClick={() => copyToClipboard(result.minified ?? '', minifiedBtnRef.current, copyLabels)}
                        className="console-text-action"
                      >
                        {t('parser.copy')}
                      </button>
                    </div>
                    <CodeOutput id="minified-output" className="max-h-24 p-3">{result.minified}</CodeOutput>
                  </div>

                  <div className="parser-card-actions">
                    <Button type="button" variant="outline" onClick={handleVisualize}>
                      <VisualizeIcon />
                      {t('parser.visualize')}
                    </Button>
                  </div>
                </CardContent>
                <textarea id="viz-raw-json" className="hidden" aria-hidden="true" defaultValue={result.minified ?? ''} />
              </Card>
            ) : (
              <Card className="border-danger-border bg-danger-light/50">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <ErrorCircleIcon className="h-4 w-4 text-danger" />
                    <span className="text-sm font-semibold text-danger">{t('parser.invalidJson')}</span>
                  </div>
                  <p className="text-sm leading-6 text-ink-secondary">{result.error}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      <VisualizerOverlay
        open={isVisualizerOpen}
        onOpenChange={(open) => {
          setIsVisualizerOpen(open);
          if (!open) {
            setVisualizerData(null);
          }
        }}
        overlayId="visualizer-overlay"
        canvasId="json-viz-canvas"
        ctrlKey="_vizCtrl"
        title={t('parser.jsonVisualizer')}
      />
    </>
  );
}
