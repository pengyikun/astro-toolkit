import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdir, rm } from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';

const testDbDir = path.join(process.cwd(), 'storage', '.test-whatsapp');
const testDbPath = path.join(testDbDir, 'messages.db');

function createTestDb(): void {
  const db = new Database(testDbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS chats (
      jid TEXT PRIMARY KEY,
      name TEXT,
      last_message_time TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT,
      chat_jid TEXT,
      sender TEXT,
      content TEXT,
      timestamp TIMESTAMP,
      is_from_me BOOLEAN,
      media_type TEXT,
      filename TEXT,
      url TEXT,
      PRIMARY KEY (id, chat_jid),
      FOREIGN KEY (chat_jid) REFERENCES chats(jid)
    );
  `);

  // Insert test chats
  const insertChat = db.prepare(`INSERT INTO chats (jid, name, last_message_time) VALUES (?, ?, ?)`);
  insertChat.run('15551234567@s.whatsapp.net', 'Contact One', '2026-04-02T10:00:00Z');
  insertChat.run('15559876543@s.whatsapp.net', 'Contact Two', '2026-04-05T15:00:00Z');
  insertChat.run('120363123456@g.us', 'Shared Group', '2026-04-03T12:00:00Z');

  // Insert test messages
  const insertMsg = db.prepare(
    `INSERT INTO messages (id, chat_jid, sender, content, timestamp, is_from_me, media_type) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  // Contact One (direct chat) messages
  insertMsg.run('msg-1', '15551234567@s.whatsapp.net', '15551234567', 'Hello from Contact One', '2026-04-01T09:00:00Z', 0, '');
  insertMsg.run('msg-2', '15551234567@s.whatsapp.net', 'me', 'Hi Contact One!', '2026-04-01T09:05:00Z', 1, '');
  insertMsg.run('msg-3', '15551234567@s.whatsapp.net', '15551234567', 'Check this image', '2026-04-02T10:00:00Z', 0, 'image');

  // Contact Two (direct chat) - last_message_time is April 5
  insertMsg.run('msg-4', '15559876543@s.whatsapp.net', '15559876543', 'Update from Contact Two', '2026-04-05T15:00:00Z', 0, '');
  // Contact Two also has a message on April 2 (within typical date range)
  insertMsg.run('msg-4b', '15559876543@s.whatsapp.net', '15559876543', 'Earlier from Contact Two', '2026-04-02T08:00:00Z', 0, '');

  // Group chat messages — sender is Contact One's phone number
  insertMsg.run('msg-5', '120363123456@g.us', '15551234567', 'Group message from Contact One', '2026-04-03T12:00:00Z', 0, '');

  // End-of-day edge case: message at 23:59:59 on April 1
  insertMsg.run('msg-6', '15551234567@s.whatsapp.net', '15551234567', 'Late night message', '2026-04-01T23:59:59Z', 0, '');

  db.close();
}

async function loadWhatsAppModule() {
  vi.resetModules();
  return import('../../lib/whatsapp');
}

describe.sequential('whatsapp runtime integration', () => {
  beforeAll(async () => {
    await mkdir(testDbDir, { recursive: true });
    createTestDb();
  });

  afterAll(async () => {
    await rm(testDbDir, { recursive: true, force: true });
  });

  it('tests connection to a valid whatsapp database', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.testWhatsAppConnection(testDbPath);
    expect(result).toEqual({ success: true });
  });

  it('fails connection test for missing database', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.testWhatsAppConnection('/nonexistent/path.db');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('fails connection test for empty path', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.testWhatsAppConnection('');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('lists all chats sorted by last activity descending (no date filter)', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listChats(testDbPath);

    expect(result.chats).toHaveLength(3);
    expect(result.chats[0]).toMatchObject({ name: 'Contact Two', jid: '15559876543@s.whatsapp.net', isGroup: false });
    expect(result.chats[1]).toMatchObject({ name: 'Shared Group', isGroup: true });
    expect(result.chats[2]).toMatchObject({ name: 'Contact One', isGroup: false });
  });

  it('filters chats by date range using actual message activity, not just last_message_time', async () => {
    const wa = await loadWhatsAppModule();
    // April 1-3: Contact One has messages, Shared Group has messages,
    // and Contact Two also has msg-4b on April 2 (even though last_message_time is April 5)
    const result = wa.listChats(testDbPath, {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-03',
    });

    const names = result.chats.map((c) => c.name);
    expect(names).toContain('Contact One');
    expect(names).toContain('Shared Group');
    // Contact Two should also appear — it has a message on April 2 within the range
    expect(names).toContain('Contact Two');
    expect(result.chats).toHaveLength(3);

    // The preview for Contact Two should be its latest message WITHIN the range (April 2)
    const contactTwo = result.chats.find((c) => c.name === 'Contact Two')!;
    expect(contactTwo.lastMessage).toBe('Earlier from Contact Two');
  });

  it('excludes chats with no messages in the date range', async () => {
    const wa = await loadWhatsAppModule();
    // April 4 only — no messages from anyone on this day
    const result = wa.listChats(testDbPath, {
      dateFrom: '2026-04-04',
      dateTo: '2026-04-04',
    });

    // Only Contact Two has a message on April 5, not April 4
    expect(result.chats).toHaveLength(0);
  });

  it('filters chats by keyword query', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listChats(testDbPath, { query: 'contact two' });

    expect(result.chats).toHaveLength(1);
    expect(result.chats[0].name).toBe('Contact Two');
  });

  it('lists messages for a specific chat with date filtering', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listMessages(testDbPath, '15551234567@s.whatsapp.net', {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-01',
    });

    // Messages from April 1st including the 23:59:59 edge case
    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]).toMatchObject({ id: 'msg-1', content: 'Hello from Contact One', isFromMe: false });
    expect(result.messages[1]).toMatchObject({ id: 'msg-2', content: 'Hi Contact One!', isFromMe: true });
    expect(result.messages[2]).toMatchObject({ id: 'msg-6', content: 'Late night message' });
  });

  it('includes end-of-day message at 23:59:59 within date range', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listMessages(testDbPath, '15551234567@s.whatsapp.net', {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-01',
    });

    const lateMsg = result.messages.find((m) => m.id === 'msg-6');
    expect(lateMsg).toBeDefined();
    expect(lateMsg!.content).toBe('Late night message');
  });

  it('lists all messages for a chat when no date filter', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listMessages(testDbPath, '15551234567@s.whatsapp.net');

    // msg-1, msg-2, msg-3, msg-6 (4 total for Contact One)
    expect(result.messages).toHaveLength(4);
  });

  it('resolves sender display names from chats table for direct chats', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listMessages(testDbPath, '15551234567@s.whatsapp.net');

    // msg-1: from Contact One (resolved via sender_chat join or chat name fallback)
    const received = result.messages.find((m) => m.id === 'msg-1')!;
    expect(received.senderName).toBe('Contact One');
    expect(received.isFromMe).toBe(false);

    // msg-2: from me
    const sent = result.messages.find((m) => m.id === 'msg-2')!;
    expect(sent.senderName).toBe('You');
    expect(sent.isFromMe).toBe(true);
  });

  it('resolves sender display names in group chats', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listMessages(testDbPath, '120363123456@g.us');

    expect(result.messages).toHaveLength(1);
    const msg = result.messages[0];
    // Sender is 15551234567, which matches Contact One's chat JID
    expect(msg.senderName).toBe('Contact One');
    expect(msg.sender).toBe('15551234567');
  });

  it('filters messages by keyword', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listMessages(testDbPath, '15551234567@s.whatsapp.net', {
      query: 'image',
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({ id: 'msg-3', mediaType: 'image' });
  });

  it('returns chat info for a specific JID', async () => {
    const wa = await loadWhatsAppModule();
    const chat = wa.getChatInfo(testDbPath, '15551234567@s.whatsapp.net');

    expect(chat).toMatchObject({
      jid: '15551234567@s.whatsapp.net',
      name: 'Contact One',
      isGroup: false,
    });
  });

  it('returns null for unknown chat JID', async () => {
    const wa = await loadWhatsAppModule();
    const chat = wa.getChatInfo(testDbPath, 'nonexistent@s.whatsapp.net');

    expect(chat).toBeNull();
  });

  it('paginates chat list correctly', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listChats(testDbPath, { page: 1, pageSize: 2 });

    expect(result.chats).toHaveLength(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);

    const page2 = wa.listChats(testDbPath, { page: 2, pageSize: 2 });
    expect(page2.chats).toHaveLength(1);
  });

  it('paginates messages correctly', async () => {
    const wa = await loadWhatsAppModule();
    const result = wa.listMessages(testDbPath, '15551234567@s.whatsapp.net', {
      page: 1,
      pageSize: 2,
    });

    expect(result.messages).toHaveLength(2);
    expect(result.page).toBe(1);

    const page2 = wa.listMessages(testDbPath, '15551234567@s.whatsapp.net', {
      page: 2,
      pageSize: 2,
    });
    expect(page2.messages).toHaveLength(2);
  });
});
