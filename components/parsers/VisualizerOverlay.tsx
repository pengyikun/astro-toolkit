'use client';

import { useState, useCallback, useRef } from 'react';

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
  overlayId: string;
  canvasId: string;
  ctrlKey: string;
  title: string;
}

export default function VisualizerOverlay({ overlayId, canvasId, ctrlKey, title }: VisualizerOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCount, setSearchCount] = useState<{ index: number; total: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function getCtrl(): VizCtrl | undefined {
    return (window as unknown as Record<string, unknown>)[ctrlKey] as VizCtrl | undefined;
  }

  const handleClose = useCallback(() => {
    const overlay = document.getElementById(overlayId);
    if (overlay) {
      overlay.classList.add('hidden');
      document.body.style.overflow = '';
    }
    setSearchQuery('');
    setSearchCount(null);
    const ctrl = getCtrl();
    if (ctrl?.clearSearch) ctrl.clearSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayId, ctrlKey]);

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
    <div id={overlayId} className="fixed inset-0 z-50 hidden" style={{ background: '#f7f8f9' }}>
      <div className="absolute top-0 left-0 right-0 h-12 bg-white border-b border-border flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 0 0 3.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0 1 20.25 6v1.5m0 9V18A2.25 2.25 0 0 1 18 20.25h-1.5m-9 0H6A2.25 2.25 0 0 1 3.75 18v-1.5M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
          <span className="text-sm font-semibold text-ink">{title}</span>
          <span className="text-[11px] text-ink-muted">Click to expand · Right-click to copy field · Cmd+C to copy node · Scroll to zoom</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center">
            <svg className="w-3.5 h-3.5 text-ink-muted absolute left-2.5 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
            <input
              type="text"
              ref={searchInputRef}
              placeholder="Search..."
              autoComplete="off"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className="w-44 pl-8 pr-2 py-1.5 text-[12px] rounded-md border border-border bg-page text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
            {searchCount !== null && (
              <span className="text-[11px] text-ink-muted ml-1.5 min-w-[3rem]">
                {searchCount.total === 0
                  ? 'No matches'
                  : `${searchCount.index + 1}/${searchCount.total}`}
              </span>
            )}
            {hasResults && (
              <>
                <button type="button" onClick={handleSearchPrev} className="p-1 rounded hover:bg-page transition-colors" title="Previous match (Shift+Enter)">
                  <svg className="w-3.5 h-3.5 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" /></svg>
                </button>
                <button type="button" onClick={handleSearchNext} className="p-1 rounded hover:bg-page transition-colors" title="Next match (Enter)">
                  <svg className="w-3.5 h-3.5 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                </button>
              </>
            )}
          </div>
          <div className="w-px h-5 bg-border mx-1"></div>
          <button type="button" onClick={handleZoomIn} className="p-1.5 rounded-md hover:bg-page transition-colors" title="Zoom in">
            <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          </button>
          <button type="button" onClick={handleZoomOut} className="p-1.5 rounded-md hover:bg-page transition-colors" title="Zoom out">
            <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" /></svg>
          </button>
          <button type="button" onClick={handleFit} className="p-1.5 rounded-md hover:bg-page transition-colors" title="Fit to view">
            <svg className="w-4 h-4 text-ink-secondary" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" /></svg>
          </button>
          <div className="w-px h-5 bg-border mx-1"></div>
          <button type="button" onClick={handleClose} className="p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Close">
            <svg className="w-4 h-4 text-ink-secondary hover:text-danger" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div className="absolute top-12 left-0 right-0 bottom-0">
        <canvas id={canvasId}></canvas>
      </div>
    </div>
  );
}
