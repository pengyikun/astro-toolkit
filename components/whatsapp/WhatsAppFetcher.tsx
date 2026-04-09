'use client';

import { useState, useTransition } from 'react';
import { useLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchChats, fetchChatMessages } from '@/actions/whatsapp';
import type { WhatsAppChat, WhatsAppMessage } from '@/types';

export default function WhatsAppFetcher() {
  const { t, formatDate } = useLocale();

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

  // Fetch state
  const [isFetching, startFetch] = useTransition();
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // Chat detail state
  const [selectedChat, setSelectedChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [isLoadingMessages, startLoadMessages] = useTransition();
  const [messagePage, setMessagePage] = useState(1);
  const [messageQuery, setMessageQuery] = useState('');

  // ── Fetch handlers ──

  const handleFetch = (fetchPage = 1) => {
    setError(null);
    setSelectedChat(null);
    setMessages([]);
    setPage(fetchPage);

    startFetch(async () => {
      const result = await fetchChats(dateFrom, dateTo, {
        page: fetchPage,
        pageSize,
        query: searchQuery || undefined,
      });
      if (result.success && result.chats) {
        setChats(result.chats);
        setHasFetched(true);
      } else {
        setError(result.error || 'Fetch failed');
      }
    });
  };

  // ── Chat detail handlers ──

  const handleOpenChat = (chat: WhatsAppChat, msgPage = 1) => {
    setSelectedChat(chat);
    setMessages([]);
    setMessagePage(msgPage);
    setMessageQuery('');
    startLoadMessages(async () => {
      const result = await fetchChatMessages(chat.jid, dateFrom, dateTo, {
        page: msgPage,
        pageSize,
      });
      if (result.success && result.messages) {
        setMessages(result.messages);
      }
    });
  };

  const handleMessageSearch = (chat: WhatsAppChat, query: string, msgPage = 1) => {
    setMessagePage(msgPage);
    startLoadMessages(async () => {
      const result = await fetchChatMessages(chat.jid, dateFrom, dateTo, {
        page: msgPage,
        pageSize,
        query: query || undefined,
      });
      if (result.success && result.messages) {
        setMessages(result.messages);
      }
    });
  };

  const handleBackToList = () => {
    setSelectedChat(null);
    setMessages([]);
  };

  // ── Chat detail view ──

  if (selectedChat) {
    return (
      <div className="section-stack mt-4">
        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="outline" size="sm" onClick={handleBackToList}>
                {t('whatsapp.backToList')}
              </Button>
              <div>
                <h3 className="text-base font-semibold text-ink">
                  {selectedChat.name}
                  {selectedChat.isGroup && <span className="ml-1.5 text-xs font-normal text-ink-secondary">{t('whatsapp.group')}</span>}
                </h3>
                <p className="text-xs text-ink-secondary font-mono">{selectedChat.jid}</p>
              </div>
            </div>

            {/* Message search */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="text"
                className="console-input flex-1"
                placeholder={t('whatsapp.searchMessagesPlaceholder')}
                value={messageQuery}
                onChange={(e) => setMessageQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleMessageSearch(selectedChat, messageQuery, 1);
                  }
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMessageSearch(selectedChat, messageQuery, 1)}
                disabled={isLoadingMessages}
              >
                {t('common.search')}
              </Button>
            </div>

            <p className="text-xs text-ink-secondary mb-3">
              {t('whatsapp.dateRangeLabel', { from: dateFrom, to: dateTo })}
            </p>
          </CardContent>
        </Card>

        {isLoadingMessages && (
          <Card>
            <CardContent className="px-4 py-8 text-center text-sm text-ink-secondary">
              {t('common.loading')}
            </CardContent>
          </Card>
        )}

        {!isLoadingMessages && messages.length > 0 && (
          <>
            <Card>
              <CardContent className="p-4 sm:p-5">
                <div className="space-y-3">
                  {messages.map((msg, index) => (
                    <div
                      key={`${msg.id}-${index}`}
                      className={`flex flex-col ${msg.isFromMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.isFromMe
                            ? 'bg-brand/10 text-ink'
                            : 'bg-page border border-border text-ink'
                        }`}
                      >
                        {!msg.isFromMe && (
                          <p className="text-xs font-medium text-brand mb-0.5">{msg.senderName}</p>
                        )}
                        {msg.mediaType ? (
                          <p className="text-xs text-ink-secondary italic">
                            [{msg.mediaType}]
                            {msg.content && ` ${msg.content}`}
                          </p>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-ink-secondary mt-0.5 px-1">
                        {msg.timestamp ? formatDate(msg.timestamp, { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Message pagination */}
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={messagePage <= 1 || isLoadingMessages}
                onClick={() => {
                  const newPage = messagePage - 1;
                  setMessagePage(newPage);
                  handleMessageSearch(selectedChat, messageQuery, newPage);
                }}
              >
                {t('common.previous')}
              </Button>
              <span className="text-sm text-ink-secondary">
                {t('common.page')} {messagePage}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={messages.length < pageSize || isLoadingMessages}
                onClick={() => {
                  const newPage = messagePage + 1;
                  setMessagePage(newPage);
                  handleMessageSearch(selectedChat, messageQuery, newPage);
                }}
              >
                {t('common.next')}
              </Button>
            </div>
          </>
        )}

        {!isLoadingMessages && messages.length === 0 && (
          <Card>
            <CardContent className="px-4 py-12 text-center text-sm text-muted-foreground">
              {t('whatsapp.noMessages')}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── Chat list view ──

  return (
    <div className="section-stack mt-4">
      {/* Config panel */}
      <Card>
        <CardContent className="p-4 sm:p-5">
          <div className="mb-4">
            <span className="text-sm text-ink-secondary">{t('whatsapp.description')}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Date range */}
            <div>
              <label htmlFor="wa-date-from" className="mb-1.5 block text-sm font-medium text-ink">{t('whatsapp.dateFrom')}</label>
              <input
                id="wa-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="console-input w-full"
              />
            </div>
            <div>
              <label htmlFor="wa-date-to" className="mb-1.5 block text-sm font-medium text-ink">{t('whatsapp.dateTo')}</label>
              <input
                id="wa-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="console-input w-full"
              />
            </div>

            {/* Search query */}
            <div>
              <label htmlFor="wa-search" className="mb-1.5 block text-sm font-medium text-ink">{t('whatsapp.search')}</label>
              <input
                id="wa-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="console-input w-full"
                placeholder={t('whatsapp.searchPlaceholder')}
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
            <Button onClick={() => handleFetch(1)} disabled={isFetching}>
              {isFetching ? t('whatsapp.fetching') : t('whatsapp.fetchChats')}
            </Button>

            {hasFetched && !error && (
              <span className="text-sm text-ink-secondary">{t('whatsapp.chatCount', { count: chats.length })}</span>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="console-notice danger">{error}</div>
      )}

      {/* Results */}
      {hasFetched && chats.length > 0 && (
        <>
          <Card className="overflow-hidden">
            <Table responsive>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('whatsapp.chatName')}</TableHead>
                  <TableHead>{t('whatsapp.lastMessage')}</TableHead>
                  <TableHead>{t('whatsapp.lastActivity')}</TableHead>
                  <TableHead>{t('whatsapp.chatType')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chats.map((chat, index) => (
                  <TableRow key={`${chat.jid}-${index}`}>
                    <TableCell data-label={t('whatsapp.chatName')}>
                      <span className="table-primary-link">{chat.name}</span>
                    </TableCell>
                    <TableCell data-label={t('whatsapp.lastMessage')} className="text-sm text-ink-secondary max-w-[300px] truncate">
                      {chat.lastIsFromMe && <span className="text-xs text-ink-secondary mr-1">{t('whatsapp.you')}:</span>}
                      {chat.lastMessage || '—'}
                    </TableCell>
                    <TableCell data-label={t('whatsapp.lastActivity')} className="text-sm whitespace-nowrap">
                      {chat.lastMessageTime ? formatDate(chat.lastMessageTime, { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                    </TableCell>
                    <TableCell data-label={t('whatsapp.chatType')} className="text-sm text-ink-secondary">
                      {chat.isGroup ? t('whatsapp.group') : t('whatsapp.direct')}
                    </TableCell>
                    <TableCell data-label={t('common.actions')} data-cell-actions="true" className="text-right">
                      <div className="table-actions justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenChat(chat)}
                          disabled={isLoadingMessages}
                        >
                          {t('whatsapp.openChat')}
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
              disabled={chats.length < pageSize || isFetching}
              onClick={() => handleFetch(page + 1)}
            >
              {t('common.next')}
            </Button>
          </div>
        </>
      )}

      {hasFetched && chats.length === 0 && !error && (
        <Card>
          <CardContent className="px-4 py-12 text-center text-sm text-muted-foreground">
            {t('whatsapp.noChats')}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
