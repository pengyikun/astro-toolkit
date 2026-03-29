'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

interface FocusInfo {
  nodeId: number;
  rowIndex: number;
  title: string;
  path: string;
  fieldKey: string;
}

interface VizCtrl {
  zoomIn: () => void;
  zoomOut: () => void;
  fitToView: () => void;
  search: (query: string) => number;
  searchNext: () => { index: number; total: number };
  searchPrev: () => { index: number; total: number };
  clearSearch: () => void;
  destroy: () => void;
  getFocusedInfo: () => FocusInfo | null;
  focusOnNode: (nodeId: number, rowIndex?: number) => void;
  onFocusChange: ((info: FocusInfo | null) => void) | null;
}

interface VizNote {
  id: number;
  snippet_id?: number;
  node_id: number;
  row_index: number;
  node_path: string;
  node_title: string;
  field_key: string;
  content: string;
  created_at?: string;
}

interface VisualizerOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  overlayId: string;
  canvasId: string;
  ctrlKey: string;
  title: string;
  snippetId?: number;
}

export default function VisualizerOverlay({
  open,
  onOpenChange,
  overlayId,
  canvasId,
  ctrlKey,
  title,
  snippetId,
}: VisualizerOverlayProps) {
  const { t } = useLocale();
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
  const shortcutKey = isMac ? 'Cmd' : 'Ctrl';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCount, setSearchCount] = useState<{ index: number; total: number } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Notes state
  const [notes, setNotes] = useState<VizNote[]>([]);
  const [notesPanelOpen, setNotesPanelOpen] = useState(false);
  const [createNoteOpen, setCreateNoteOpen] = useState(false);
  const [focusedInfo, setFocusedInfo] = useState<FocusInfo | null>(null);
  const [newNoteContent, setNewNoteContent] = useState('');
  const localIdRef = useRef(0);

  function getCtrl(): VizCtrl | undefined {
    return (window as unknown as Record<string, unknown>)[ctrlKey] as VizCtrl | undefined;
  }

  // ── Load persisted notes ──
  useEffect(() => {
    if (!open || !snippetId) return;
    fetch(`/api/snippets/${snippetId}/notes`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setNotes(data); })
      .catch(() => {});
  }, [open, snippetId]);

  const resetOverlayState = useCallback(() => {
    setSearchQuery('');
    setSearchCount(null);
    setNotes([]);
    setNotesPanelOpen(false);
    setCreateNoteOpen(false);
    setFocusedInfo(null);
    setNewNoteContent('');
    localIdRef.current = 0;
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

  // Register focus change callback
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      const ctrl = getCtrl();
      if (ctrl) {
        ctrl.onFocusChange = (info) => setFocusedInfo(info);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ctrlKey]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  // ── Search ──
  const handleZoomIn = useCallback(() => { getCtrl()?.zoomIn(); }, [ctrlKey]);
  const handleZoomOut = useCallback(() => { getCtrl()?.zoomOut(); }, [ctrlKey]);
  const handleFit = useCallback(() => { getCtrl()?.fitToView(); }, [ctrlKey]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    const ctrl = getCtrl();
    if (!ctrl) return;
    if (!query.trim()) { ctrl.clearSearch(); setSearchCount(null); return; }
    const total = ctrl.search(query);
    if (total > 0) { setSearchCount(ctrl.searchNext()); } else { setSearchCount({ index: -1, total: 0 }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const handleSearchNext = useCallback(() => {
    const ctrl = getCtrl();
    if (ctrl) setSearchCount(ctrl.searchNext());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const handleSearchPrev = useCallback(() => {
    const ctrl = getCtrl();
    if (ctrl) setSearchCount(ctrl.searchPrev());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? handleSearchPrev() : handleSearchNext(); }
  }, [handleSearchNext, handleSearchPrev]);

  // ── Note handlers ──
  const handleCreateNote = useCallback(() => {
    if (!focusedInfo) return;
    setCreateNoteOpen(true);
    setNotesPanelOpen(true);
    setNewNoteContent('');
  }, [focusedInfo]);

  const handleAddNote = useCallback(async () => {
    if (!focusedInfo || !newNoteContent.trim()) return;

    const noteData = {
      node_id: focusedInfo.nodeId,
      row_index: focusedInfo.rowIndex,
      node_path: focusedInfo.path,
      node_title: focusedInfo.title,
      field_key: focusedInfo.fieldKey || '',
      content: newNoteContent.trim(),
    };

    if (snippetId) {
      try {
        const res = await fetch(`/api/snippets/${snippetId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(noteData),
        });
        if (res.ok) {
          const saved = await res.json();
          setNotes((prev) => [...prev, saved]);
        }
      } catch { /* ignore */ }
    } else {
      const local: VizNote = { id: --localIdRef.current, ...noteData };
      setNotes((prev) => [...prev, local]);
    }

    setNewNoteContent('');
    setCreateNoteOpen(false);
  }, [focusedInfo, newNoteContent, snippetId]);

  const handleDeleteNote = useCallback(async (note: VizNote) => {
    if (snippetId && note.id > 0) {
      try {
        await fetch(`/api/snippets/${snippetId}/notes?noteId=${note.id}`, { method: 'DELETE' });
      } catch { /* ignore */ }
    }
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
  }, [snippetId]);

  const handleNoteClick = useCallback((note: VizNote) => {
    const ctrl = getCtrl();
    if (!ctrl) return;
    ctrl.focusOnNode(note.node_id, note.row_index);
    setFocusedInfo({
      nodeId: note.node_id,
      rowIndex: note.row_index,
      title: note.node_title,
      path: note.node_path,
      fieldKey: note.field_key,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctrlKey]);

  const hasResults = searchCount !== null && searchCount.total > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={t('common.close')}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInputRef.current?.focus();
        }}
        className="inset-0 flex h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 flex-col gap-0 border-0 bg-[var(--canvas)] p-0 shadow-none sm:rounded-none"
      >
        <div id={overlayId} className="flex min-h-0 flex-1 flex-col">
          {/* ── Toolbar ── */}
          <div className="shrink-0 border-b border-border bg-panel px-4 py-3 pr-14">
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
                      {searchCount === null ? '' : searchCount.total === 0 ? t('parser.noMatches') : `${searchCount.index + 1}/${searchCount.total}`}
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
                  <div className="hidden h-5 w-px bg-border lg:block" />
                  <Button
                    type="button"
                    variant={notesPanelOpen ? 'default' : 'ghost'}
                    size="icon"
                    className="h-11 w-11"
                    onClick={() => setNotesPanelOpen(!notesPanelOpen)}
                    title={t('parser.notes')}
                    aria-label={t('parser.notes')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" /></svg>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-11 gap-1.5 px-3 text-sm"
                    onClick={handleCreateNote}
                    disabled={!focusedInfo}
                    title={focusedInfo ? t('parser.createNote') : t('parser.selectNodeFirst')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                    {t('parser.createNote')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Canvas + Notes panel ── */}
          <div className="flex min-h-0 flex-1">
            <div className="min-h-0 min-w-0 flex-1">
              <canvas id={canvasId} className="block h-full w-full" />
            </div>

            {notesPanelOpen && (
              <div className="flex w-80 shrink-0 flex-col border-l border-border backdrop-blur-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--panel) 80%, transparent)' }}>
                <div className="shrink-0 border-b border-border px-4 py-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink">{t('parser.notes')}</h3>
                  {notes.length > 0 && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-ink-muted">{notes.length}</span>
                  )}
                </div>

                {/* ── Create note form ── */}
                {createNoteOpen && focusedInfo && (
                  <div className="shrink-0 border-b border-border bg-muted/30 p-4 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-ink-muted">{t('parser.notePath')}</label>
                      <p className="mt-1 rounded bg-page px-2 py-1.5 text-xs font-mono text-brand break-all">{focusedInfo.path}</p>
                    </div>
                    {focusedInfo.fieldKey && (
                      <div>
                        <label className="text-xs font-medium text-ink-muted">{t('parser.noteField')}</label>
                        <p className="mt-1 text-xs font-mono text-ink">{focusedInfo.fieldKey}</p>
                      </div>
                    )}
                    <div>
                      <Textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder={t('parser.noteContentPlaceholder')}
                        rows={3}
                        className="text-sm"
                        autoFocus
                      />
                      <p className="mt-1 text-[0.7rem] text-ink-muted">Markdown supported</p>
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setCreateNoteOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button size="sm" onClick={handleAddNote} disabled={!newNoteContent.trim()}>
                        {t('parser.addNote')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Notes list ── */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {notes.length === 0 ? (
                    <p className="px-4 py-8 text-center text-xs text-ink-muted">{t('parser.noNotes')}</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {notes.map((note) => (
                        <li key={note.id} className="group">
                          <div
                            role="button"
                            tabIndex={0}
                            className="w-full cursor-pointer px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                            onClick={() => handleNoteClick(note)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleNoteClick(note); }}
                          >
                            <p className="text-xs font-mono text-brand break-all">{note.node_path}</p>
                            {note.field_key && (
                              <p className="mt-0.5 text-[0.7rem] text-ink-muted">{t('parser.noteField')}: {note.field_key}</p>
                            )}
                            <div className="mt-1.5 text-sm text-ink leading-snug prose prose-sm prose-neutral max-w-none [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0 [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded">
                              <ReactMarkdown>{note.content}</ReactMarkdown>
                            </div>
                          </div>
                          <div className="px-4 pb-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              className="text-xs text-danger hover:underline"
                              onClick={() => handleDeleteNote(note)}
                            >
                              {t('parser.deleteNote')}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
