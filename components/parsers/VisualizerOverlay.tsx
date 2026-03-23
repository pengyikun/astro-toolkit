'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

interface VizCtrl {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToView: () => void;
  search: (query: string) => number;
  searchNext: () => { index: number; total: number };
  searchPrev: () => { index: number; total: number };
  clearSearch: () => void;
  destroy: () => void;
}

interface VisualizerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overlayId: string;
  canvasId: string;
  ctrlKey: string;
  title: string;
}

export default function VisualizerOverlay({
  open,
  onOpenChange,
  overlayId,
  canvasId,
  ctrlKey,
  title,
}: VisualizerOverlayProps) {
  const { t } = useLocale();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
  const shortcutKey = isMac ? 'Cmd' : 'Ctrl';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCount, setSearchCount] = useState<{ index: number; total: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function getCtrl(): VizCtrl | undefined {
    return (window as unknown as Record<string, unknown>)[ctrlKey] as VizCtrl | undefined;
  }

  const resetOverlayState = useCallback(() => {
    setSearchQuery('');
    setSearchCount(null);
    const ctrl = getCtrl();
    if (ctrl?.clearSearch) ctrl.clearSearch();
    ctrl?.destroy?.();
    (window as unknown as Record<string, unknown>)[ctrlKey] = undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  useEffect(() => {
    if (!open) {
      resetOverlayState();
    }
  }, [open, resetOverlayState]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const handleZoomIn = useCallback(() => {
    getCtrl()?.zoomIn();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const handleZoomOut = useCallback(() => {
    getCtrl()?.zoomOut();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const handleFit = useCallback(() => {
    getCtrl()?.fitToView();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    const ctrl = getCtrl();
    if (!ctrl) return;

    if (!query.trim()) {
      ctrl.clearSearch();
      setSearchCount(null);
      return;
    }

    const total = ctrl.search(query);
    if (total > 0) {
      const result = ctrl.searchNext();
      setSearchCount(result);
    } else {
      setSearchCount({ index: -1, total: 0 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const handleSearchNext = useCallback(() => {
    const ctrl = getCtrl();
    if (!ctrl) return;
    const result = ctrl.searchNext();
    setSearchCount(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const handleSearchPrev = useCallback(() => {
    const ctrl = getCtrl();
    if (!ctrl) return;
    const result = ctrl.searchPrev();
    setSearchCount(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handleSearchPrev();
      } else {
        handleSearchNext();
      }
    }
  }, [handleSearchNext, handleSearchPrev]);

  const hasResults = searchCount !== null && searchCount.total > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('common.close')}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInputRef.current?.focus();
        }}
        className="inset-0 h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 gap-0 border-0 bg-[var(--canvas)] p-0 shadow-none sm:rounded-none"
      >
        <div id={overlayId} className="flex h-full min-h-0 flex-col">
          <div className="border-b border-border bg-panel px-4 py-3 pr-14">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <svg className="mt-0.5 w-4 h-4 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
                <div className="min-w-0">
                  <DialogTitle className="text-sm font-semibold text-ink">{title}</DialogTitle>
                  <DialogDescription className="mt-1 text-xs leading-relaxed text-ink-muted">
                    {t('parser.vizHint', { shortcutKey })}
                  </DialogDescription>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2 lg:items-end">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <div className="relative flex w-full min-w-0 items-center sm:flex-1 lg:min-w-[18rem]">
                    <svg className="absolute left-2.5 w-3.5 h-3.5 text-ink-muted pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    <Input
                      type="text"
                      ref={searchInputRef}
                      placeholder={t('parser.searchPlaceholder')}
                      aria-label={t('parser.searchPlaceholder')}
                      autoComplete="off"
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      className="h-11 border-border bg-page pl-8 pr-3 text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <span className="min-w-[3.5rem] text-sm text-ink-muted sm:text-right" role="status" aria-live="polite">
                      {searchCount === null
                        ? ''
                        : searchCount.total === 0
                          ? t('parser.noMatches')
                          : `${searchCount.index + 1}/${searchCount.total}`}
                    </span>
                    {hasResults && (
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={handleSearchPrev} title={t('parser.previousMatch')} aria-label={t('parser.previousMatch')}>
                          <svg className="w-3.5 h-3.5 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" onClick={handleSearchNext} title={t('parser.nextMatch')} aria-label={t('parser.nextMatch')}>
                          <svg className="w-3.5 h-3.5 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 pt-2 sm:border-t-0 sm:pt-0">
                  <div className="hidden h-5 w-px bg-border lg:block" />
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={handleZoomIn} title={t('parser.zoomIn')} aria-label={t('parser.zoomIn')}>
                    <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={handleZoomOut} title={t('parser.zoomOut')} aria-label={t('parser.zoomOut')}>
                    <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-11 w-11" onClick={handleFit} title={t('parser.fitToView')} aria-label={t('parser.fitToView')}>
                    <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <canvas id={canvasId} className="h-full w-full" />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
