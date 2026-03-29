'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { copyToClipboard } from '@/lib/clipboard';
import { useLocale } from '@/lib/i18n/client';
import { Badge } from '@/components/ui/badge';
import { CheckCircleIcon, VisualizeIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CodeOutput } from '@/components/ui/code-output';
import { showToast } from '@/components/ui/FlashMessage';

const VisualizerOverlay = dynamic(() => import('./VisualizerOverlay'), { ssr: false });

interface JsonParseData {
  valid: boolean;
  repaired?: boolean;
  formatted?: string;
  minified?: string;
  stats?: {
    keys: number;
    depth: number;
    objectCount: number;
    arrayCount: number;
    stringCount: number;
    numberCount: number;
    size: number;
  };
}

interface SnippetJsonDetailViewProps {
  content: string;
  parseData: JsonParseData;
  snippetId?: number;
}

export default function SnippetJsonDetailView({ content, parseData, snippetId }: SnippetJsonDetailViewProps) {
  const { t } = useLocale();
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [visualizerData, setVisualizerData] = useState<unknown | null>(null);
  const formattedBtnRef = useRef<HTMLButtonElement>(null);
  const minifiedBtnRef = useRef<HTMLButtonElement>(null);
  const rawBtnRef = useRef<HTMLButtonElement>(null);

  const copyLabels = { prompt: t('parser.copyPrompt'), shown: t('parser.copyShown'), copied: t('parser.copied') };

  const handleVisualize = useCallback(() => {
    if (!parseData.minified) return;
    try {
      setVisualizerData(JSON.parse(parseData.minified));
      setIsVisualizerOpen(true);
    } catch {
      showToast('error', t('parser.cannotVisualizeJson'));
    }
  }, [parseData, t]);

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
      <div className="grid grid-cols-1 gap-4 lg:gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-5 sm:p-6">
              <div className="mb-2 flex items-center gap-2">
                <span className="console-inline-label">{t('parser.jsonInput')}</span>
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
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-success" />
                  <span className="text-sm font-semibold text-success">{t('parser.validJson')}</span>
                  {parseData.repaired && (
                    <Badge variant="warning" className="gap-1.5">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.192-.14 1.743" />
                      </svg>
                      {t('parser.repaired')}
                    </Badge>
                  )}
                </div>
              </div>

              {parseData.stats && (
                <div className="parser-card-section parser-card-section-muted">
                  <div className="console-stats-grid">
                    <div className="console-stats-row"><span>{t('parser.keys')}</span><strong>{parseData.stats.keys}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.depth')}</span><strong>{parseData.stats.depth}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.objects')}</span><strong>{parseData.stats.objectCount}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.arrays')}</span><strong>{parseData.stats.arrayCount}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.strings')}</span><strong>{parseData.stats.stringCount}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.numbers')}</span><strong>{parseData.stats.numberCount}</strong></div>
                    <div className="console-stats-row"><span>{t('parser.size')}</span><strong>{parseData.stats.size} B</strong></div>
                  </div>
                </div>
              )}

              <div className="parser-card-section">
                <div className="mb-2 flex items-center gap-2">
                  <span className="console-inline-label">{t('parser.formatted')}</span>
                  <button
                    type="button"
                    ref={formattedBtnRef}
                    onClick={() => copyToClipboard(parseData.formatted ?? '', formattedBtnRef.current, copyLabels)}
                    className="console-text-action"
                  >
                    {t('parser.copy')}
                  </button>
                </div>
                <CodeOutput id="formatted-output" className="max-h-80">{parseData.formatted}</CodeOutput>
              </div>

              <div className="parser-card-section">
                <div className="mb-2 flex items-center gap-2">
                  <span className="console-inline-label">{t('parser.minified')}</span>
                  <button
                    type="button"
                    ref={minifiedBtnRef}
                    onClick={() => copyToClipboard(parseData.minified ?? '', minifiedBtnRef.current, copyLabels)}
                    className="console-text-action"
                  >
                    {t('parser.copy')}
                  </button>
                </div>
                <CodeOutput id="minified-output" className="max-h-24 p-3">{parseData.minified}</CodeOutput>
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
        overlayId="visualizer-overlay"
        canvasId="json-viz-canvas"
        ctrlKey="_vizCtrl"
        title={t('parser.jsonVisualizer')}
        snippetId={snippetId}
      />
    </>
  );
}
