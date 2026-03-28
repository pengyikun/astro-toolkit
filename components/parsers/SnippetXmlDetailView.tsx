'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { copyToClipboard } from '@/lib/clipboard';
import { useLocale } from '@/lib/i18n/client';
import { CheckCircleIcon, VisualizeIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CodeOutput } from '@/components/ui/code-output';
import { showToast } from '@/components/ui/FlashMessage';

const VisualizerOverlay = dynamic(() => import('./VisualizerOverlay'), { ssr: false });

interface XmlParseData {
  valid: boolean;
  formatted?: string;
  toJson?: string;
  stats?: {
    elementCount: number;
    attributeCount: number;
    textNodeCount: number;
    depth: number;
    size: number;
  };
}

interface SnippetXmlDetailViewProps {
  content: string;
  parseData: XmlParseData;
}

export default function SnippetXmlDetailView({ content, parseData }: SnippetXmlDetailViewProps) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<'xml-tab' | 'json-tab'>('xml-tab');
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [visualizerData, setVisualizerData] = useState<unknown | null>(null);
  const xmlCopyBtnRef = useRef<HTMLButtonElement>(null);
  const jsonCopyBtnRef = useRef<HTMLButtonElement>(null);
  const rawBtnRef = useRef<HTMLButtonElement>(null);

  const copyLabels = { prompt: t('parser.copyPrompt'), shown: t('parser.copyShown'), copied: t('parser.copied') };

  const handleVisualize = useCallback(() => {
    if (!parseData.toJson) return;
    try {
      setVisualizerData(JSON.parse(parseData.toJson));
      setIsVisualizerOpen(true);
    } catch {
      showToast('error', t('parser.cannotVisualizeXml'));
    }
  }, [parseData, t]);

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
      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="console-inline-label">{t('parser.xmlInput')}</span>
                <button
                  type="button"
                  ref={rawBtnRef}
                  onClick={() => copyToClipboard(content, rawBtnRef.current, copyLabels)}
                  className="console-text-action"
                >
                  {t('parser.copy')}
                </button>
              </div>
              <CodeOutput id="raw-output" className="max-h-[32rem]">{content}</CodeOutput>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="parser-card-header">
                <div className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-success" />
                  <span className="text-sm font-semibold text-success">{t('parser.validXml')}</span>
                </div>
              </div>

              {parseData.stats && (
                <div className="parser-card-section parser-card-section-muted">
                  <div className="console-stats-grid">
                    <div className="console-stats-row"><span>{t('parser.elements')}</span><strong>{parseData.stats.elementCount}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.attributes')}</span><strong>{parseData.stats.attributeCount}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.textNodes')}</span><strong>{parseData.stats.textNodeCount}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.maxDepth')}</span><strong>{parseData.stats.depth}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.size')}</span><strong>{parseData.stats.size} B</strong></div>
                  </div>
                </div>
              )}

              <div className="parser-card-section parser-tab-section">
                <div className="console-tab-list">
                  <button
                    type="button"
                    onClick={() => setActiveTab('xml-tab')}
                    className={`tab-btn console-tab-button ${activeTab === 'xml-tab' ? 'is-active' : ''}`}
                  >
                    {t('parser.xmlFormatted')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('json-tab')}
                    className={`tab-btn console-tab-button ${activeTab === 'json-tab' ? 'is-active' : ''}`}
                  >
                    {t('parser.jsonConverted')}
                  </button>
                </div>
              </div>

              <div className={`parser-card-section ${activeTab !== 'xml-tab' ? 'hidden' : ''}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="console-inline-label">XML</span>
                  <button
                    type="button"
                    ref={xmlCopyBtnRef}
                    onClick={() => copyToClipboard(parseData.formatted ?? '', xmlCopyBtnRef.current, copyLabels)}
                    className="console-text-action"
                  >
                    {t('parser.copy')}
                  </button>
                </div>
                <CodeOutput id="xml-output" className="max-h-96">{parseData.formatted}</CodeOutput>
              </div>

              <div className={`parser-card-section ${activeTab !== 'json-tab' ? 'hidden' : ''}`}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="console-inline-label">JSON</span>
                  <button
                    type="button"
                    ref={jsonCopyBtnRef}
                    onClick={() => copyToClipboard(parseData.toJson ?? '', jsonCopyBtnRef.current, copyLabels)}
                    className="console-text-action"
                  >
                    {t('parser.copy')}
                  </button>
                </div>
                <CodeOutput id="json-output" className="max-h-96">{parseData.toJson}</CodeOutput>
              </div>

              <div className="parser-card-actions">
                <Button type="button" variant="outline" onClick={handleVisualize}>
                  <VisualizeIcon />
                  {t('parser.visualize')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <VisualizerOverlay
        open={isVisualizerOpen}
        onOpenChange={(open) => {
          setIsVisualizerOpen(open);
          if (!open) setVisualizerData(null);
        }}
        overlayId="xml-visualizer-overlay"
        canvasId="xml-viz-canvas"
        ctrlKey="_xmlVizCtrl"
        title={t('parser.xmlVisualizer')}
      />
    </>
  );
}
