'use client';

import { useState, useTransition, useCallback } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  fetchEnvelopes,
  fetchEnvelopeThreads,
  fetchMessage,
  fetchMessageThread,
  fetchMessageRaw,
  fetchMailFolders,
  fetchAttachments,
  diagnoseMailAccount,
} from '@/actions/mail';
import type { MailEnvelope, MailMessage, MailFolder } from '@/types';

interface MailFetcherProps {
  configuredEmail: string;
}

type ViewMode = 'list' | 'thread';

export default function MailFetcher({ configuredEmail }: MailFetcherProps) {
  const { t, formatDate } = useLocale();

  // Folder state
  const [folders, setFolders] = useState<string[]>(['INBOX']);
  const [availableFolders, setAvailableFolders] = useState<MailFolder[]>([]);
  const [isLoadingFolders, startLoadFolders] = useTransition();

  // Date state - default to last 7 days
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const [dateFrom, setDateFrom] = useState(weekAgo.toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(today.toISOString().slice(0, 10));

  // Search & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Fetch state
  const [isFetching, startFetch] = useTransition();
  const [envelopes, setEnvelopes] = useState<MailEnvelope[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Message state
  const [selectedMessage, setSelectedMessage] = useState<MailMessage | null>(null);
  const [threadMessages, setThreadMessages] = useState<MailMessage[]>([]);
  const [isLoadingMessage, startLoadMessage] = useTransition();

  // Raw export state
  const [rawSource, setRawSource] = useState<string | null>(null);
  const [isExportingRaw, startExportRaw] = useTransition();

  // Attachment state
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; token: string }>>([]);
  const [attachmentDownloadId, setAttachmentDownloadId] = useState<string | null>(null);
  const [isDownloadingAttachments, startDownloadAttachments] = useTransition();

  // Body display mode
  const [bodyView, setBodyView] = useState<'source' | 'rendered'>('rendered');

  // Diagnose state
  const [diagnoseOutput, setDiagnoseOutput] = useState<string | null>(null);
  const [isDiagnosing, startDiagnose] = useTransition();

  // ── Folder handlers ──

  const handleLoadFolders = useCallback(() => {
    startLoadFolders(async () => {
      const result = await fetchMailFolders();
      if (result.success && result.folders) {
        setAvailableFolders(result.folders);
      }
    });
  }, []);

  const handleAddFolder = useCallback((folder: string) => {
    if (folder && !folders.includes(folder)) {
      setFolders((prev) => [...prev, folder]);
    }
  }, [folders]);

  const handleRemoveFolder = useCallback((folder: string) => {
    setFolders((prev) => prev.filter((f) => f !== folder));
  }, []);

  // ── Fetch handlers ──

  const handleFetch = (fetchPage = 1) => {
    setError(null);
    setSelectedMessage(null);
    setThreadMessages([]);
    setRawSource(null);
    setAttachments([]);
    setPage(fetchPage);

    startFetch(async () => {
      if (viewMode === 'thread' && folders.length === 1) {
        const result = await fetchEnvelopeThreads(folders[0], {
          dateFrom,
          dateTo,
          page: fetchPage,
          pageSize,
          query: searchQuery || undefined,
        });
        if (result.success && result.envelopes) {
          setEnvelopes(result.envelopes);
          setHasFetched(true);
        } else {
          setError(result.error || 'Fetch failed');
        }
      } else {
        const result = await fetchEnvelopes(folders, dateFrom, dateTo, {
          page: fetchPage,
          pageSize,
          query: searchQuery || undefined,
        });
        if (result.success && result.envelopes) {
          setEnvelopes(result.envelopes);
          setHasFetched(true);
        } else {
          setError(result.error || 'Fetch failed');
        }
      }
    });
  };

  // ── Message handlers ──

  const handleReadMessage = (envelope: MailEnvelope) => {
    setSelectedMessage(null);
    setThreadMessages([]);
    setRawSource(null);
    setAttachments([]);
    setAttachmentDownloadId(null);
    startLoadMessage(async () => {
      const result = await fetchMessage(envelope.folder, envelope.id);
      if (result.success && result.message) {
        setSelectedMessage({
          ...result.message,
          subject: result.message.subject || envelope.subject,
          from: result.message.from || envelope.from,
          to: result.message.to || envelope.to,
          date: result.message.date || envelope.date,
        });
      }
    });
  };

  const handleReadThread = (envelope: MailEnvelope) => {
    setSelectedMessage(null);
    setThreadMessages([]);
    setRawSource(null);
    startLoadMessage(async () => {
      const result = await fetchMessageThread(envelope.folder, envelope.id);
      if (result.success && result.messages) {
        setThreadMessages(result.messages);
        // Use first message or envelope info for display
        setSelectedMessage({
          id: envelope.id,
          subject: envelope.subject,
          from: envelope.from,
          to: envelope.to,
          cc: '',
          date: envelope.date,
          body: '',
          folder: envelope.folder,
          hasAttachment: envelope.hasAttachment,
        });
      }
    });
  };

  const handleExportRaw = (envelope: MailEnvelope) => {
    startExportRaw(async () => {
      const result = await fetchMessageRaw(envelope.folder, envelope.id);
      if (result.success && result.raw) {
        setRawSource(result.raw);
      }
    });
  };

  const handleDownloadAttachments = (msg: MailMessage) => {
    startDownloadAttachments(async () => {
      const result = await fetchAttachments(msg.folder, msg.id);
      if (result.success && result.files) {
        setAttachments(result.files);
        setAttachmentDownloadId(result.downloadId ?? null);
      }
    });
  };

  const handleDiagnose = () => {
    setDiagnoseOutput(null);
    startDiagnose(async () => {
      const result = await diagnoseMailAccount();
      if (result.success && result.output) {
        setDiagnoseOutput(result.output);
      } else {
        setDiagnoseOutput(result.error || 'Diagnosis failed');
      }
    });
  };

  function linkifyText(text: string): string {
    return text.replace(
      /https?:\/\/[^\s<>&"')\]]+/g,
      (url) => `<a href="${url}" target="_blank" rel="noreferrer noopener">${url}</a>`,
    );
  }

  function normalizeForRender(raw: string): string {
    let text = raw;
    // Decode JSON-encoded bare string (Himalaya wraps output in JSON quotes)
    if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) {
      try {
        const decoded = JSON.parse(text);
        if (typeof decoded === 'string') text = decoded;
      } catch { /* keep as-is */ }
    }
    // Convert literal escape sequences to real characters
    text = text.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
    // Strip leading RFC-style email headers before the blank-line boundary
    const headerEnd = text.indexOf('\n\n');
    if (headerEnd !== -1) {
      const headerBlock = text.slice(0, headerEnd);
      if (/^[A-Za-z][\w-]*:\s/m.test(headerBlock)) {
        text = text.slice(headerEnd + 2);
      }
    }
    return text;
  }

  function sanitizeHtml(html: string): string {
    // Remove script/style/iframe/object/embed/form tags and their content
    let safe = html.replace(/<(script|style|iframe|object|embed|form|applet|base|link)[\s\S]*?<\/\1>/gi, '');
    // Remove self-closing dangerous tags
    safe = safe.replace(/<(script|iframe|object|embed|form|applet|base|link|meta)[^>]*\/?>/gi, '');
    // Remove all event handler attributes (on*)
    safe = safe.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '');
    // Remove javascript: and data: URLs from href/src/action attributes
    safe = safe.replace(/(href|src|action)\s*=\s*(?:"(?:javascript|data|vbscript):[^"]*"|'(?:javascript|data|vbscript):[^']*')/gi, '$1=""');
    // Block external resource loading: rewrite src attributes on img tags to prevent tracking pixels
    safe = safe.replace(/<img\s[^>]*src\s*=\s*(?:"(https?:\/\/[^"]*)"|'(https?:\/\/[^']*)')([^>]*)>/gi,
      (_, url1, url2, rest) => `<img alt="[external image blocked]" title="${url1 || url2}"${rest}>`);
    return safe;
  }

  function buildRenderedSrcdoc(body: string): string {
    const normalized = normalizeForRender(body);
    const looksLikeHtml = /<[a-z][\s\S]*?>/i.test(normalized);
    let content: string;
    if (looksLikeHtml) {
      content = sanitizeHtml(normalized);
    } else {
      const escaped = normalized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      content = escaped
        .split(/\n{2,}/)
        .map((para) => `<p style="margin:0 0 1em 0">${linkifyText(para).replace(/\n/g, '<br>')}</p>`)
        .join('');
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:;"><style>body{margin:0;padding:16px;font-family:-apple-system,system-ui,sans-serif;font-size:14px;line-height:1.6;color:#1a1a1a;word-break:break-word}img{max-width:100%;height:auto}a{color:#2563eb}</style></head><body>${content}</body></html>`;
  }

  // ── Message detail view ──

  if (selectedMessage && (selectedMessage.body || threadMessages.length > 0)) {
    const currentEnvelope = envelopes.find(
      (e) => e.id === selectedMessage.id && e.folder === selectedMessage.folder,
    );

    return (
      <div className="section-stack mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            setSelectedMessage(null);
            setThreadMessages([]);
            setRawSource(null);
            setAttachments([]);
          }}>
            ← {t('mail.backToList')}
          </Button>

          {currentEnvelope && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportRaw(currentEnvelope)}
                disabled={isExportingRaw}
              >
                {isExportingRaw ? t('common.loading') : t('mail.exportRaw')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadAttachments(selectedMessage)}
                disabled={isDownloadingAttachments}
              >
                {isDownloadingAttachments ? t('common.loading') : t('mail.downloadAttachments')}
              </Button>
              {threadMessages.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReadThread(currentEnvelope)}
                  disabled={isLoadingMessage}
                >
                  {t('mail.viewThread')}
                </Button>
              )}
            </>
          )}
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-ink mb-2">{t('mail.attachments')} ({attachments.length})</h3>
              <div className="space-y-1">
                {attachments.map((file) => (
                  <div key={file.name} className="flex items-center gap-3 text-sm">
                    <a
                      href={`/api/mail/attachments/${attachmentDownloadId}/${encodeURIComponent(file.name)}?token=${encodeURIComponent(file.token)}`}
                      download
                      className="text-brand hover:text-brand-dark font-medium"
                    >
                      {file.name}
                    </a>
                    <span className="text-ink-secondary">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Thread messages */}
        {threadMessages.length > 0 ? (
          threadMessages.map((msg, i) => (
            <Card key={i} className="mt-4">
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-1 text-sm mb-4">
                  <div><span className="font-medium text-ink-secondary">{t('mail.from')}:</span> <span className="text-ink">{msg.from}</span></div>
                  <div><span className="font-medium text-ink-secondary">{t('mail.to')}:</span> <span className="text-ink">{msg.to}</span></div>
                  {msg.cc && (
                    <div><span className="font-medium text-ink-secondary">{t('mail.cc')}:</span> <span className="text-ink">{msg.cc}</span></div>
                  )}
                  {msg.date && (
                    <div><span className="font-medium text-ink-secondary">{t('mail.date')}:</span> <span className="text-ink">{msg.date}</span></div>
                  )}
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex gap-1 mb-3">
                    <Button
                      size="sm"
                      variant={bodyView === 'rendered' ? 'default' : 'outline'}
                      onClick={() => setBodyView('rendered')}
                    >
                      {t('mail.viewRendered')}
                    </Button>
                    <Button
                      size="sm"
                      variant={bodyView === 'source' ? 'default' : 'outline'}
                      onClick={() => setBodyView('source')}
                    >
                      {t('mail.viewSource')}
                    </Button>
                  </div>
                  {bodyView === 'source' ? (
                    <pre className="whitespace-pre-wrap text-sm text-ink font-mono leading-relaxed">{msg.body}</pre>
                  ) : (
                    <iframe
                      sandbox=""
                      srcDoc={buildRenderedSrcdoc(msg.body)}
                      className="w-full border border-border rounded bg-white"
                      style={{ minHeight: '200px' }}
                      onLoad={(e) => {
                        const frame = e.currentTarget;
                        if (frame.contentDocument?.body) {
                          frame.style.height = `${frame.contentDocument.body.scrollHeight + 32}px`;
                        }
                      }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="mt-4">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3 mb-6">
                <h2 className="text-lg font-semibold text-ink">{selectedMessage.subject}</h2>
                <div className="grid gap-2 text-sm">
                  <div><span className="font-medium text-ink-secondary">{t('mail.from')}:</span> <span className="text-ink">{selectedMessage.from}</span></div>
                  <div><span className="font-medium text-ink-secondary">{t('mail.to')}:</span> <span className="text-ink">{selectedMessage.to}</span></div>
                  {selectedMessage.cc && (
                    <div><span className="font-medium text-ink-secondary">{t('mail.cc')}:</span> <span className="text-ink">{selectedMessage.cc}</span></div>
                  )}
                  <div><span className="font-medium text-ink-secondary">{t('mail.date')}:</span> <span className="text-ink">{selectedMessage.date}</span></div>
                  <div><span className="font-medium text-ink-secondary">{t('mail.folder')}:</span> <span className="text-ink">{selectedMessage.folder}</span></div>
                  {currentEnvelope?.flags && currentEnvelope.flags.length > 0 && (
                    <div><span className="font-medium text-ink-secondary">{t('mail.flags')}:</span> <span className="text-ink font-mono">{currentEnvelope.flags.join(', ')}</span></div>
                  )}
                </div>
              </div>
              <div className="border-t border-border pt-4">
                <div className="flex gap-1 mb-3">
                  <Button
                    size="sm"
                    variant={bodyView === 'rendered' ? 'default' : 'outline'}
                    onClick={() => setBodyView('rendered')}
                  >
                    {t('mail.viewRendered')}
                  </Button>
                  <Button
                    size="sm"
                    variant={bodyView === 'source' ? 'default' : 'outline'}
                    onClick={() => setBodyView('source')}
                  >
                    {t('mail.viewSource')}
                  </Button>
                </div>
                {bodyView === 'source' ? (
                  <pre className="whitespace-pre-wrap text-sm text-ink font-mono leading-relaxed">{selectedMessage.body}</pre>
                ) : (
                  <iframe
                    sandbox=""
                    srcDoc={buildRenderedSrcdoc(selectedMessage.body)}
                    className="w-full border border-border rounded bg-white"
                    style={{ minHeight: '200px' }}
                    onLoad={(e) => {
                      const frame = e.currentTarget;
                      if (frame.contentDocument?.body) {
                        frame.style.height = `${frame.contentDocument.body.scrollHeight + 32}px`;
                      }
                    }}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Raw source */}
        {rawSource && (
          <Card className="mt-4">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-sm font-semibold text-ink mb-2">{t('mail.rawSource')}</h3>
              <pre className="whitespace-pre-wrap text-xs text-ink-secondary font-mono leading-relaxed max-h-96 overflow-y-auto rounded border border-border bg-page/40 p-3">{rawSource}</pre>
            </CardContent>
          </Card>
        )}

        {/* Diagnose output */}
        {diagnoseOutput && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-ink mb-2">{t('mail.diagnoseResult')}</h3>
              <pre className="whitespace-pre-wrap text-xs text-ink-secondary font-mono leading-relaxed">{diagnoseOutput}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Envelope list view ──

  return (
    <div className="section-stack mt-4">
      {/* Config panel */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <span className="text-sm text-ink-secondary">{t('mail.configuredAs', { email: configuredEmail })}</span>
            <Button type="button" variant="outline" size="sm" onClick={handleDiagnose} disabled={isDiagnosing}>
              {isDiagnosing ? t('common.loading') : t('mail.diagnose')}
            </Button>
          </div>

          {diagnoseOutput && (
            <div className="mb-4 rounded border border-border bg-page/40 p-3">
              <pre className="whitespace-pre-wrap text-xs text-ink-secondary font-mono">{diagnoseOutput}</pre>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Folders */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="mb-1.5 block text-sm font-medium text-ink">{t('mail.folders')}</label>
              <div className="space-y-2">
                {folders.map((f) => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="flex-1 rounded border border-border bg-page/40 px-3 py-1.5 text-sm text-ink font-mono truncate">{f}</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveFolder(f)}>
                      {t('mail.removeFolder')}
                    </Button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  {availableFolders.length > 0 ? (
                    <select
                      className="console-input flex-1"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddFolder(e.target.value);
                          e.target.value = '';
                        }
                      }}
                    >
                      <option value="" disabled>{t('mail.selectFolder')}</option>
                      {availableFolders.filter((f) => !folders.includes(f.name)).map((f) => (
                        <option key={f.name} value={f.name}>{f.name}{f.desc ? ` — ${f.desc}` : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="console-input flex-1"
                      placeholder={t('mail.foldersPlaceholder')}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          handleAddFolder(input.value.trim());
                          input.value = '';
                        }
                      }}
                    />
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={handleLoadFolders} disabled={isLoadingFolders}>
                    {isLoadingFolders ? t('mail.loadingFolders') : t('mail.loadFolders')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Date range */}
            <div>
              <label htmlFor="mail-date-from" className="mb-1.5 block text-sm font-medium text-ink">{t('mail.dateFrom')}</label>
              <input
                id="mail-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="console-input w-full"
              />
            </div>
            <div>
              <label htmlFor="mail-date-to" className="mb-1.5 block text-sm font-medium text-ink">{t('mail.dateTo')}</label>
              <input
                id="mail-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="console-input w-full"
              />
            </div>

            {/* Search query */}
            <div>
              <label htmlFor="mail-search" className="mb-1.5 block text-sm font-medium text-ink">{t('mail.search')}</label>
              <input
                id="mail-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="console-input w-full"
                placeholder={t('mail.searchPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleFetch(1);
                  }
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => handleFetch(1)} disabled={isFetching || folders.length === 0}>
              {isFetching ? t('mail.fetching') : t('mail.fetchEmails')}
            </Button>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-brand text-white' : 'text-ink-secondary hover:text-ink'}`}
              >
                {t('mail.viewList')}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('thread')}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${viewMode === 'thread' ? 'bg-brand text-white' : 'text-ink-secondary hover:text-ink'}`}
              >
                {t('mail.viewThreads')}
              </button>
            </div>

            {hasFetched && !error && (
              <span className="text-sm text-ink-secondary">{t('mail.emailCount', { count: envelopes.length })}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="console-notice danger">{error}</div>
      )}

      {/* Results */}
      {hasFetched && envelopes.length > 0 && (
        <>
          <Card className="overflow-hidden">
            <Table responsive>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('mail.flags')}</TableHead>
                  <TableHead>{t('mail.subject')}</TableHead>
                  <TableHead>{t('mail.from')}</TableHead>
                  <TableHead>{t('mail.date')}</TableHead>
                  <TableHead>{t('mail.folder')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {envelopes.map((envelope, index) => (
                  <TableRow key={`${envelope.folder}-${envelope.id || index}`}>
                    <TableCell data-label={t('mail.flags')} className="text-xs font-mono text-ink-secondary whitespace-nowrap">
                      {envelope.flags.length > 0 ? envelope.flags.join(' ') : '—'}
                    </TableCell>
                    <TableCell data-label={t('mail.subject')}>
                      <span className="table-primary-link">{envelope.subject}</span>
                      {envelope.hasAttachment && <span className="ml-1 text-xs text-ink-secondary" title="Attachment">Att</span>}
                    </TableCell>
                    <TableCell data-label={t('mail.from')} className="text-sm text-ink-secondary">
                      {envelope.from}
                    </TableCell>
                    <TableCell data-label={t('mail.date')} className="text-sm whitespace-nowrap">
                      {envelope.date ? formatDate(envelope.date, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </TableCell>
                    <TableCell data-label={t('mail.folder')} className="font-mono text-sm text-ink-secondary">
                      {envelope.folder}
                    </TableCell>
                    <TableCell data-label={t('common.actions')} data-cell-actions="true" className="text-right">
                      <div className="table-actions justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReadMessage(envelope)}
                          disabled={isLoadingMessage}
                        >
                          {t('mail.readMessage')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReadThread(envelope)}
                          disabled={isLoadingMessage}
                        >
                          {t('mail.viewThread')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => handleFetch(page - 1)}
            >
              {t('common.previous')}
            </Button>
            <span className="text-sm text-ink-secondary">
              {t('common.page')} {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={envelopes.length < pageSize || isFetching}
              onClick={() => handleFetch(page + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        </>
      )}

      {hasFetched && envelopes.length === 0 && !error && (
        <Card>
          <CardContent className="px-4 py-12 text-center text-sm text-muted-foreground">
            {t('mail.noEmails')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
