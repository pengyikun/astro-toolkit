'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { parseXml, type XmlParseResult } from '@/lib/xml-parser';
import { copyToClipboard } from '@/lib/clipboard';
import { useCodeEditor } from '@/hooks/useCodeEditor';
import { useLocale } from '@/lib/i18n/client';
import { CheckCircleIcon, ErrorCircleIcon, UploadIcon, VisualizeIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CodeOutput } from '@/components/ui/code-output';
import { showToast } from '@/components/ui/FlashMessage';
import SaveSnippetDialog from './SaveSnippetDialog';

const VisualizerOverlay = dynamic(() => import('./VisualizerOverlay'), { ssr: false });

export default function XmlParser() {
  const { t } = useLocale();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<XmlParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'xml-tab' | 'json-tab'>('xml-tab');
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [visualizerData, setVisualizerData] = useState<unknown | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xmlCopyBtnRef = useRef<HTMLButtonElement>(null);
  const jsonCopyBtnRef = useRef<HTMLButtonElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const copyLabels = { prompt: t('parser.copyPrompt'), shown: t('parser.copyShown'), copied: t('parser.copied') };

  useCodeEditor({ value: input, language: 'xml', gutterRef, highlightRef, textareaRef });

  useEffect(() => {
    const stored = sessionStorage.getItem('load-snippet-content');
    if (stored) {
      setInput(stored);
      setResult(null);
      setFileName('');
      sessionStorage.removeItem('load-snippet-content');
    }
  }, []);

  const handleParse = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = parseXml(input);
      setResult(parsed);
      setActiveTab('xml-tab');
    } catch (err) {
      setResult({
        valid: false,
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
    if (!result?.toJson) return;
    try {
      setVisualizerData(JSON.parse(result.toJson));
      setIsVisualizerOpen(true);
    } catch {
      showToast('error', t('parser.cannotVisualizeXml'));
    }
  }, [result, t]);

  useEffect(() => {
    if (!isVisualizerOpen || !visualizerData) return;

    const frame = requestAnimationFrame(() => {
      const canvas = document.getElementById('xml-viz-canvas') as HTMLCanvasElement | null;
      if (!canvas) return;

      const initVisualizer = (window as unknown as Record<string, unknown>).initXmlVisualizer;
      if (typeof initVisualizer === 'function') {
        (window as unknown as Record<string, unknown>)._xmlVizCtrl = (
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
                    <label htmlFor="xml-input" className="console-inline-label">{t('parser.xmlInput')}</label>
                    <div className="code-editor-toolbar-actions">
                      <Button variant="outline" size="sm" asChild>
                        <label htmlFor="xml-file" className="cursor-pointer">
                          <UploadIcon />
                          {t('parser.upload')}
                        </label>
                      </Button>
                      <input
                        type="file"
                        id="xml-file"
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
                        id="xml-input"
                        ref={textareaRef}
                        rows={16}
                        placeholder='<root><item id="1">Hello</item></root>'
                        className="code-editor-input"
                        data-language="xml"
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
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-success">{t('parser.validXml')}</span>
                    </div>
                  </div>

                  {result.stats && (
                    <div className="parser-card-section parser-card-section-muted">
                      <div className="console-stats-grid">
                        <div className="console-stats-row"><span>{t('parser.elements')}</span><strong>{result.stats.elementCount}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.attributes')}</span><strong>{result.stats.attributeCount}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.textNodes')}</span><strong>{result.stats.textNodeCount}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.maxDepth')}</span><strong>{result.stats.depth}</strong></div>
                        <div className="console-stats-row"><span>{t('parser.size')}</span><strong>{result.stats.size} B</strong></div>
                      </div>
                    </div>
                  )}

                  <div className="parser-card-section parser-tab-section">
                    <div className="console-tab-list">
                      <button
                        type="button"
                        onClick={() => setActiveTab('xml-tab')}
                        className={`tab-btn console-tab-button ${activeTab === 'xml-tab' ? 'is-active' : ''}`}
                        data-tab="xml-tab"
                      >
                        {t('parser.xmlFormatted')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveTab('json-tab')}
                        className={`tab-btn console-tab-button ${activeTab === 'json-tab' ? 'is-active' : ''}`}
                        data-tab="json-tab"
                      >
                        {t('parser.jsonConverted')}
                      </button>
                    </div>
                  </div>

                  <div id="xml-tab" className={`parser-card-section ${activeTab !== 'xml-tab' ? 'hidden' : ''}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="console-inline-label">XML</span>
                      <button
                        type="button"
                        ref={xmlCopyBtnRef}
                        onClick={() => copyToClipboard(result.formatted ?? '', xmlCopyBtnRef.current, copyLabels)}
                        className="console-text-action"
                      >
                        {t('parser.copy')}
                      </button>
                    </div>
                    <CodeOutput id="xml-output" className="max-h-96">{result.formatted}</CodeOutput>
                  </div>

                  <div id="json-tab" className={`parser-card-section ${activeTab !== 'json-tab' ? 'hidden' : ''}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="console-inline-label">JSON</span>
                      <button
                        type="button"
                        ref={jsonCopyBtnRef}
                        onClick={() => copyToClipboard(result.toJson ?? '', jsonCopyBtnRef.current, copyLabels)}
                        className="console-text-action"
                      >
                        {t('parser.copy')}
                      </button>
                    </div>
                    <CodeOutput id="json-output" className="max-h-96">{result.toJson}</CodeOutput>
                  </div>

                  <div className="parser-card-actions">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVisualize}
                    >
                      <VisualizeIcon />
                      {t('parser.visualize')}
                    </Button>
                    <SaveSnippetDialog
                      snippetType="xml"
                      content={input}
                      parseResult={JSON.stringify({ valid: result.valid, formatted: result.formatted, toJson: result.toJson, stats: result.stats })}
                    />
                  </div>
                </CardContent>
                <textarea id="viz-raw-xml-json" className="hidden" aria-hidden="true" defaultValue={result.toJson ?? ''} />
              </Card>
            ) : (
              <Card className="border-danger-border bg-danger-light/50">
                <CardContent className="p-5 sm:p-6">
                  <div className="mb-3 flex items-center gap-2">
                    <ErrorCircleIcon className="h-4 w-4 text-danger" />
                    <span className="text-sm font-semibold text-danger">{t('parser.invalidXml')}</span>
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
        overlayId="xml-visualizer-overlay"
        canvasId="xml-viz-canvas"
        ctrlKey="_xmlVizCtrl"
        title={t('parser.xmlVisualizer')}
      />
    </>
  );
}
