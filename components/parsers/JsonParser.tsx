'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { parseJson, type JsonParseResult } from '@/lib/json-parser';
import { useCodeEditor } from '@/hooks/useCodeEditor';
import { useLocale } from '@/lib/i18n/client';

const VisualizerOverlay = dynamic(() => import('./VisualizerOverlay'), { ssr: false });

function copyToClipboard(text: string, buttonEl: HTMLButtonElement | null, labels: { prompt: string; shown: string; copied: string }) {
  if (!buttonEl) return;
  const originalLabel = buttonEl.textContent ?? '';

  function showCopiedState(label: string) {
    if (!buttonEl) return;
    buttonEl.textContent = label;
    setTimeout(() => { buttonEl.textContent = originalLabel; }, 2000);
  }

  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    window.prompt(labels.prompt, text);
    showCopiedState(labels.shown);
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showCopiedState(labels.copied);
  }).catch(() => {
    window.prompt(labels.prompt, text);
    showCopiedState(labels.shown);
  });
}

export default function JsonParser() {
  const { t } = useLocale();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<JsonParseResult | null>(null);
  const [fileName, setFileName] = useState('');
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
      const data = JSON.parse(result.minified);
      const overlay = document.getElementById('visualizer-overlay');
      const canvas = document.getElementById('json-viz-canvas') as HTMLCanvasElement | null;
      if (!overlay || !canvas) return;

      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        if (typeof (window as unknown as Record<string, unknown>).initJsonVisualizer === 'function') {
          (window as unknown as Record<string, unknown>)._vizCtrl = (window as unknown as Record<string, (...args: unknown[]) => unknown>).initJsonVisualizer(canvas, data);
        }
      });
    } catch {
      alert(t('parser.cannotVisualizeJson'));
    }
  }, [result]);

  return (
    <>
      <div className={`grid grid-cols-1 ${result ? 'lg:grid-cols-5' : ''} gap-4 lg:gap-6 mt-8`}>
        {/* Left Panel: Input */}
        <div className={result ? 'lg:col-span-3' : ''}>
          <div className="console-panel">
            <div className="console-panel-body">
              <form onSubmit={handleParse}>
                <div className="code-editor">
                  <div className="code-editor-toolbar">
                    <label htmlFor="json-input" className="console-inline-label">{t('parser.jsonInput')}</label>
                    <div className="code-editor-toolbar-actions">
                      <label htmlFor="json-file" className="console-button-secondary cursor-pointer">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                        {t('parser.upload')}
                        <input
                          type="file"
                          id="json-file"
                          ref={fileInputRef}
                          className="hidden"
                          onChange={handleFileLoad}
                        />
                      </label>
                      <span id="file-name" className="text-xs text-ink-muted">{fileName}</span>
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
                  <button type="submit" className="console-button-primary">
                    {t('parser.parseAndValidate')}
                  </button>
                  <label htmlFor="json-file" className="console-text-action inline-flex items-center gap-2 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    {t('parser.replaceFromFile')}
                  </label>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Right Panel: Result */}
        {result && (
          <div className="lg:col-span-2">
            {result.valid ? (
              <div className="console-panel overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    <span className="text-sm font-semibold text-success">{t('parser.validJson')}</span>
                    {result.repaired && (
                      <span className="signal-chip warning">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743" /></svg>
                        {t('parser.repaired')}
                      </span>
                    )}
                  </div>
                </div>

                {result.stats && (
                  <div className="px-5 py-3 border-b border-border bg-page/50">
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

                <div className="px-5 py-3 border-b border-border">
                  <div className="flex items-center gap-2 mb-2">
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
                  <pre id="formatted-output" className="bg-page rounded-lg p-4 text-xs text-ink font-mono overflow-x-auto whitespace-pre-wrap max-h-80 overflow-y-auto border border-border">{result.formatted}</pre>
                </div>

                <div className="px-5 py-3">
                  <div className="flex items-center gap-2 mb-2">
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
                  <pre id="minified-output" className="bg-page rounded-lg p-3 text-xs text-ink font-mono overflow-x-auto whitespace-pre-wrap max-h-24 overflow-y-auto border border-border">{result.minified}</pre>
                </div>

                <div className="px-5 py-3 border-t border-border">
                  <button
                    type="button"
                    onClick={handleVisualize}
                    className="console-button-secondary"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    {t('parser.visualize')}
                  </button>
                </div>
                <textarea id="viz-raw-json" className="hidden" aria-hidden="true" defaultValue={result.minified ?? ''} />
              </div>
            ) : (
              <div className="console-panel overflow-hidden border-l-4 border-l-danger">
                <div className="px-5 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                    <span className="text-sm font-semibold text-danger">{t('parser.invalidJson')}</span>
                  </div>
                  <p className="text-sm text-ink-secondary">{result.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <VisualizerOverlay
        overlayId="visualizer-overlay"
        canvasId="json-viz-canvas"
        ctrlKey="_vizCtrl"
        title={t('parser.jsonVisualizer')}
      />
    </>
  );
}
