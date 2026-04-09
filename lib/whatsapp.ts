import Database from 'better-sqlite3';
import path from 'path';
import type { WhatsAppChat, WhatsAppChatList, WhatsAppMessage } from '@/types';

const MAX_QUERY_LENGTH = 512;
const MAX_PAGE_SIZE = 100;
const MAX_JID_LENGTH = 128;

export function validateWhatsAppDbPath(dbPath: string): string {
  if (!dbPath) {
    throw new Error('WhatsApp database path is not configured. Go to Settings to configure it.');
  }
  // Ensure path is absolute and ends with .db to prevent arbitrary file access
  const resolved = path.resolve(dbPath);
  if (!resolved.endsWith('.db')) {
    throw new Error('WhatsApp database path must point to a .db file.');
  }
  return resolved;
}

export function validateChatJid(jid: unknown): string {
  const value = String(jid ?? '');
  if (
    value.length === 0 ||
    value.length > MAX_JID_LENGTH ||
    value.trim().length === 0 ||
    /[\x00-\x1f\x7f]/.test(value)
  ) {
    throw new Error('Invalid chat JID');
  }
  return value;
}

function clampPage(page: unknown): number {
  const n = Number(page) || 1;
  return Math.max(1, Math.min(n, 10_000));
}

function clampPageSize(size: unknown): number {
  const n = Number(size) || 50;
  return Math.max(1, Math.min(n, MAX_PAGE_SIZE));
}

function chatMatchesQuery(chat: WhatsAppChat, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = `${chat.name} ${chat.jid} ${chat.lastMessage}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function openDb(dbPath: string): Database.Database {
  return new Database(dbPath, { readonly: true, fileMustExist: true });
}

/**
 * Build inclusive start / exclusive next-day-start boundaries from date strings.
 * Returns ISO-8601 UTC strings safe for lexical comparison with SQLite timestamps.
 */
function buildDateBounds(dateFrom?: string, dateTo?: string): { from?: string; to?: string } {
  const result: { from?: string; to?: string } = {};
  if (dateFrom) {
    result.from = `${dateFrom}T00:00:00`;
  }
  if (dateTo) {
    // Exclusive upper bound: start of the next day
    const next = new Date(`${dateTo}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    const y = next.getUTCFullYear();
    const m = String(next.getUTCMonth() + 1).padStart(2, '0');
    const d = String(next.getUTCDate()).padStart(2, '0');
    result.to = `${y}-${m}-${d}T00:00:00`;
  }
  return result;
}

export function testWhatsAppConnection(dbPath: string): { success: boolean; error?: string } {
  try {
    const validPath = validateWhatsAppDbPath(dbPath);
    const db = openDb(validPath);
    try {
      const tables = db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('chats', 'messages')"
      ).all() as Array<{ name: string }>;
      if (tables.length < 2) {
        return { success: false, error: 'WhatsApp database does not contain expected tables (chats, messages).' };
      }
      return { success: true };
    } finally {
      db.close();
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to connect to WhatsApp database' };
  }
}

export function listChats(
  dbPath: string,
  opts: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number; query?: string } = {},
): WhatsAppChatList {
  const validPath = validateWhatsAppDbPath(dbPath);
  const db = openDb(validPath);

  try {
    const page = clampPage(opts.page);
    const pageSize = clampPageSize(opts.pageSize);
    const bounds = buildDateBounds(opts.dateFrom, opts.dateTo);

    // If date filters are provided, find chats that have messages within the
    // date range and show the latest message within that range as the preview.
    // If no date filters, fall back to a simple join on last_message_time.
    if (bounds.from || bounds.to) {
      const conditions: string[] = [];
      const params: (string | number)[] = [];

      if (bounds.from) {
        conditions.push('m.timestamp >= ?');
        params.push(bounds.from);
      }
      if (bounds.to) {
        conditions.push('m.timestamp < ?');
        params.push(bounds.to);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const rows = db.prepare(`
        WITH ranked AS (
          SELECT
            m.chat_jid,
            m.content,
            m.sender,
            m.is_from_me,
            m.timestamp,
            ROW_NUMBER() OVER (
              PARTITION BY m.chat_jid
              ORDER BY m.timestamp DESC, m.id DESC
            ) AS rn
          FROM messages m
          ${whereClause}
        )
        SELECT
          c.jid,
          c.name,
          r.timestamp AS last_message_time,
          r.content AS last_message,
          r.sender AS last_sender,
          r.is_from_me AS last_is_from_me
        FROM ranked r
        JOIN chats c ON c.jid = r.chat_jid
        WHERE r.rn = 1
        ORDER BY r.timestamp DESC
      `).all(...params) as Array<{
        jid: string;
        name: string | null;
        last_message_time: string | null;
        last_message: string | null;
        last_sender: string | null;
        last_is_from_me: number | null;
      }>;

      let chats: WhatsAppChat[] = rows.map((row) => ({
        jid: row.jid,
        name: row.name || row.jid,
        lastMessageTime: row.last_message_time || '',
        lastMessage: row.last_message || '',
        lastSender: row.last_sender || '',
        lastIsFromMe: Boolean(row.last_is_from_me),
        isGroup: row.jid.endsWith('@g.us'),
      }));

      // Client-side keyword filtering
      if (opts.query) {
        chats = chats.filter((c) => chatMatchesQuery(c, opts.query!));
      }

      const startIndex = (page - 1) * pageSize;
      const paginated = chats.slice(startIndex, startIndex + pageSize);

      return { chats: paginated, page, pageSize };
    }

    // No date filter — use simple join on last_message_time, hard-capped at 1000 rows
    const rows = db.prepare(`
      SELECT
        chats.jid,
        chats.name,
        chats.last_message_time,
        messages.content AS last_message,
        messages.sender AS last_sender,
        messages.is_from_me AS last_is_from_me
      FROM chats
      LEFT JOIN messages
        ON chats.jid = messages.chat_jid
        AND chats.last_message_time = messages.timestamp
      ORDER BY chats.last_message_time DESC
      LIMIT 1000
    `).all() as Array<{
      jid: string;
      name: string | null;
      last_message_time: string | null;
      last_message: string | null;
      last_sender: string | null;
      last_is_from_me: number | null;
    }>;

    let chats: WhatsAppChat[] = rows.map((row) => ({
      jid: row.jid,
      name: row.name || row.jid,
      lastMessageTime: row.last_message_time || '',
      lastMessage: row.last_message || '',
      lastSender: row.last_sender || '',
      lastIsFromMe: Boolean(row.last_is_from_me),
      isGroup: row.jid.endsWith('@g.us'),
    }));

    if (opts.query) {
      chats = chats.filter((c) => chatMatchesQuery(c, opts.query!));
    }

    const startIndex = (page - 1) * pageSize;
    const paginated = chats.slice(startIndex, startIndex + pageSize);

    return { chats: paginated, page, pageSize };
  } finally {
    db.close();
  }
}

export function listMessages(
  dbPath: string,
  chatJid: string,
  opts: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number; query?: string } = {},
): { messages: WhatsAppMessage[]; page: number; pageSize: number } {
  const validPath = validateWhatsAppDbPath(dbPath);
  const safeJid = validateChatJid(chatJid);
  const db = openDb(validPath);

  try {
    const page = clampPage(opts.page);
    const pageSize = clampPageSize(opts.pageSize);
    const bounds = buildDateBounds(opts.dateFrom, opts.dateTo);

    const conditions: string[] = ['messages.chat_jid = ?'];
    const params: (string | number)[] = [safeJid];

    if (bounds.from) {
      conditions.push('messages.timestamp >= ?');
      params.push(bounds.from);
    }

    if (bounds.to) {
      conditions.push('messages.timestamp < ?');
      params.push(bounds.to);
    }

    if (opts.query) {
      conditions.push('LOWER(messages.content) LIKE LOWER(?)');
      params.push(`%${opts.query.slice(0, MAX_QUERY_LENGTH)}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Resolve sender display names by looking up sender JIDs in the chats table.
    // The sender field stores just the user part (e.g. "15551234567"),
    // so we match against chats.jid with the @s.whatsapp.net suffix.
    const rows = db.prepare(`
      SELECT
        messages.id,
        messages.chat_jid,
        chats.name AS chat_name,
        messages.sender,
        sender_chat.name AS sender_name,
        messages.content,
        messages.timestamp,
        messages.is_from_me,
        messages.media_type
      FROM messages
      JOIN chats ON messages.chat_jid = chats.jid
      LEFT JOIN chats AS sender_chat
        ON sender_chat.jid = (messages.sender || '@s.whatsapp.net')
      ${whereClause}
      ORDER BY messages.timestamp ASC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, (page - 1) * pageSize) as Array<{
      id: string;
      chat_jid: string;
      chat_name: string | null;
      sender: string | null;
      sender_name: string | null;
      content: string | null;
      timestamp: string | null;
      is_from_me: number;
      media_type: string | null;
    }>;

    const messages: WhatsAppMessage[] = rows.map((row) => {
      let senderName: string;
      if (row.is_from_me) {
        senderName = 'You';
      } else if (row.sender_name) {
        senderName = row.sender_name;
      } else if (row.chat_name && !row.chat_jid.endsWith('@g.us')) {
        // Direct chat — use the chat name as sender
        senderName = row.chat_name;
      } else {
        // Fallback to raw sender number
        senderName = row.sender || '';
      }

      return {
        id: row.id,
        chatJid: row.chat_jid,
        chatName: row.chat_name || row.chat_jid,
        sender: row.sender || '',
        senderName,
        content: row.content || '',
        timestamp: row.timestamp || '',
        isFromMe: Boolean(row.is_from_me),
        mediaType: row.media_type || '',
      };
    });

    return { messages, page, pageSize };
  } finally {
    db.close();
  }
}

export function getChatInfo(
  dbPath: string,
  chatJid: string,
): WhatsAppChat | null {
  const validPath = validateWhatsAppDbPath(dbPath);
  const safeJid = validateChatJid(chatJid);
  const db = openDb(validPath);

  try {
    const row = db.prepare(`
      SELECT
        chats.jid,
        chats.name,
        chats.last_message_time,
        messages.content AS last_message,
        messages.sender AS last_sender,
        messages.is_from_me AS last_is_from_me
      FROM chats
      LEFT JOIN messages
        ON chats.jid = messages.chat_jid
        AND chats.last_message_time = messages.timestamp
      WHERE chats.jid = ?
    `).get(safeJid) as {
      jid: string;
      name: string | null;
      last_message_time: string | null;
      last_message: string | null;
      last_sender: string | null;
      last_is_from_me: number | null;
    } | undefined;

    if (!row) return null;

    return {
      jid: row.jid,
      name: row.name || row.jid,
      lastMessageTime: row.last_message_time || '',
      lastMessage: row.last_message || '',
      lastSender: row.last_sender || '',
      lastIsFromMe: Boolean(row.last_is_from_me),
      isGroup: row.jid.endsWith('@g.us'),
    };
  } finally {
    db.close();
  }
}
