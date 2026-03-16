'use client';

import { useState, useCallback, useRef } from 'react';
import { parseXml, type XmlParseResult } from '@/lib/xml-parser';
import { useCodeEditor } from '@/hooks/useCodeEditor';
import VisualizerOverlay from './VisualizerOverlay';

function copyToClipboard(text: string, buttonEl: HTMLButtonElement | null) {
  if (!buttonEl) return;
  const originalLabel = buttonEl.textContent ?? '';

  function showCopiedState(label: string) {
    if (!buttonEl) return;
    buttonEl.textContent = label;
    setTimeout(() => { buttonEl.textContent = originalLabel; }, 2000);
  }

  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
    window.prompt('Copy this value:', text);
    showCopiedState('Shown');
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    showCopiedState('Copied!');
  }).catch(() => {
    window.prompt('Copy this value:', text);
    showCopiedState('Shown');
  });
}

export default function XmlParser() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<XmlParseResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'xml-tab' | 'json-tab'>('xml-tab');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const xmlCopyBtnRef = useRef<HTMLButtonElement>(null);
  const jsonCopyBtnRef = useRef<HTMLButtonElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useCodeEditor({ value: input, language: 'xml', gutterRef, highlightRef, textareaRef });

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
        error: err instanceof Error ? err.message : 'Unexpected error during parsing',
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
      const data = JSON.parse(result.toJson);
      const overlay = document.getElementById('xml-visualizer-overlay');
      const canvas = document.getElementById('xml-viz-canvas') as HTMLCanvasElement | null;
      if (!overlay || !canvas) return;

      overlay.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        if (typeof (window as unknown as Record<string, unknown>).initXmlVisualizer === 'function') {
          (window as unknown as Record<string, unknown>)._xmlVizCtrl = (window as unknown as Record<string, (...args: unknown[]) => unknown>).initXmlVisualizer(canvas, data);
        }
      });
    } catch {
      alert('Cannot visualize: failed to parse XML-to-JSON data');
    }
  }, [result]);

  return (
    <>
      <div className={`grid grid-cols-1 ${result ? 'lg:grid-cols-5' : ''} gap-6 mt-8`}>
        {/* Left Panel: Input */}
        <div className={result ? 'lg:col-span-3' : ''}>
          <div className="console-panel">
            <div className="console-panel-body">
              <form onSubmit={handleParse}>
                <div className="code-editor">
                  <div className="code-editor-toolbar">
                    <label htmlFor="xml-input" className="console-inline-label">XML input</label>
                    <div className="code-editor-toolbar-actions">
                      <label htmlFor="xml-file" className="console-button-secondary cursor-pointer">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                        Upload file
                        <input
                          type="file"
                          id="xml-file"
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
                  <button type="submit" className="console-button-primary">
                    Parse &amp; Validate
                  </button>
                  <label htmlFor="xml-file" className="console-text-action inline-flex items-center gap-2 cursor-pointer">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    Replace from file
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
                    <span className="text-sm font-semibold text-success">Valid XML</span>
                  </div>
                </div>

                {result.stats && (
                  <div className="px-5 py-3 border-b border-border bg-page/50">
                    <div className="console-stats-grid">
                      <div className="console-stats-row"><span>Elements</span><strong>{result.stats.elementCount}</strong></div>
                      <div className="console-stats-row"><span>Attributes</span><strong>{result.stats.attributeCount}</strong></div>
                      <div className="console-stats-row"><span>Text nodes</span><strong>{result.stats.textNodeCount}</strong></div>
                      <div className="console-stats-row"><span>Max depth</span><strong>{result.stats.depth}</strong></div>
                      <div className="console-stats-row"><span>Size</span><strong>{result.stats.size} B</strong></div>
                    </div>
                  </div>
                )}

                {/* Tab navigation */}
                <div className="px-5 pt-3 border-b border-border">
                  <div className="console-tab-list">
                    <button
                      type="button"
                      onClick={() => setActiveTab('xml-tab')}
                      className={`tab-btn console-tab-button ${activeTab === 'xml-tab' ? 'is-active' : ''}`}
                      data-tab="xml-tab"
                    >
                      Formatted XML
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('json-tab')}
                      className={`tab-btn console-tab-button ${activeTab === 'json-tab' ? 'is-active' : ''}`}
                      data-tab="json-tab"
                    >
                      JSON output
                    </button>
                  </div>
                </div>

                <div id="xml-tab" className={`px-5 py-3 ${activeTab !== 'xml-tab' ? 'hidden' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="console-inline-label">XML</span>
                    <button
                      type="button"
                      ref={xmlCopyBtnRef}
                      onClick={() => copyToClipboard(result.formatted ?? '', xmlCopyBtnRef.current)}
                      className="console-text-action"
                    >
                      Copy
                    </button>
                  </div>
                  <pre id="xml-output" className="bg-page rounded-lg p-4 text-xs text-ink font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto border border-border">{result.formatted}</pre>
                </div>

                <div id="json-tab" className={`px-5 py-3 ${activeTab !== 'json-tab' ? 'hidden' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="console-inline-label">JSON</span>
                    <button
                      type="button"
                      ref={jsonCopyBtnRef}
                      onClick={() => copyToClipboard(result.toJson ?? '', jsonCopyBtnRef.current)}
                      className="console-text-action"
                    >
                      Copy
                    </button>
                  </div>
                  <pre id="json-output" className="bg-page rounded-lg p-4 text-xs text-ink font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto border border-border">{result.toJson}</pre>
                </div>

                <div className="px-5 py-3 border-t border-border">
                  <button
                    type="button"
                    onClick={handleVisualize}
                    className="console-button-secondary"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                    Visualize XML
                  </button>
                </div>
                <textarea id="viz-raw-xml-json" className="hidden" aria-hidden="true" defaultValue={result.toJson ?? ''} />
              </div>
            ) : (
              <div className="console-panel overflow-hidden border-l-4 border-l-danger">
                <div className="px-5 py-5">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                    <span className="text-sm font-semibold text-danger">Invalid XML</span>
                  </div>
                  <p className="text-sm text-ink-secondary">{result.error}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <VisualizerOverlay
        overlayId="xml-visualizer-overlay"
        canvasId="xml-viz-canvas"
        ctrlKey="_xmlVizCtrl"
        title="XML Visualizer"
      />
    </>
  );
}
