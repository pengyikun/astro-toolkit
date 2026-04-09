import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AccessScope, WhatsAppSetting } from '../../types';

const cacheMocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
}));

const accessMocks = vi.hoisted(() => ({
  ownerUserIdFromScope: vi.fn(),
  requireAccessScope: vi.fn(),
}));

const modelMocks = vi.hoisted(() => ({
  findByOwner: vi.fn(),
  remove: vi.fn(),
  upsert: vi.fn(),
}));

const whatsappMocks = vi.hoisted(() => ({
  testWhatsAppConnection: vi.fn(),
  listChats: vi.fn(),
  listMessages: vi.fn(),
  getChatInfo: vi.fn(),
  validateChatJid: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: cacheMocks.revalidatePath,
}));

vi.mock('@/lib/access', () => ({
  ownerUserIdFromScope: accessMocks.ownerUserIdFromScope,
  requireAccessScope: accessMocks.requireAccessScope,
}));

vi.mock('@/models/whatsapp-setting.model', () => ({
  findByOwner: modelMocks.findByOwner,
  remove: modelMocks.remove,
  upsert: modelMocks.upsert,
}));

vi.mock('@/lib/db', () => ({
  default: {},
}));

vi.mock('@/lib/whatsapp', () => ({
  testWhatsAppConnection: whatsappMocks.testWhatsAppConnection,
  listChats: whatsappMocks.listChats,
  listMessages: whatsappMocks.listMessages,
  getChatInfo: whatsappMocks.getChatInfo,
  validateChatJid: whatsappMocks.validateChatJid,
}));

import {
  saveWhatsAppSettings,
  deleteWhatsAppSettings,
  getWhatsAppSettings,
  testWhatsAppDb,
  fetchChats,
  fetchChatMessages,
} from '../../actions/whatsapp';

function createScope(overrides: Partial<AccessScope> = {}): AccessScope {
  return { userId: 7, role: 'operator', ...overrides };
}

function createWhatsAppSetting(overrides: Partial<WhatsAppSetting> = {}): WhatsAppSetting {
  return {
    id: 1,
    owner_user_id: 7,
    db_path: '/path/to/messages.db',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe.sequential('whatsapp actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    accessMocks.requireAccessScope.mockResolvedValue(createScope());
    accessMocks.ownerUserIdFromScope.mockReturnValue(7);

    modelMocks.findByOwner.mockResolvedValue(createWhatsAppSetting());
    modelMocks.remove.mockResolvedValue(undefined);
    modelMocks.upsert.mockResolvedValue(undefined);

    whatsappMocks.testWhatsAppConnection.mockReturnValue({ success: true });
    whatsappMocks.validateChatJid.mockImplementation((v: unknown) => String(v));
    whatsappMocks.getChatInfo.mockReturnValue({
      jid: '15551234567@s.whatsapp.net',
      name: 'Contact One',
      lastMessageTime: '2026-04-02T10:00:00Z',
      lastMessage: 'Hello',
      lastSender: '15551234567',
      lastIsFromMe: false,
      isGroup: false,
    });
    whatsappMocks.listChats.mockReturnValue({
      chats: [{
        jid: '15551234567@s.whatsapp.net',
        name: 'Contact One',
        lastMessageTime: '2026-04-02T10:00:00Z',
        lastMessage: 'Hello',
        lastSender: '15551234567',
        lastIsFromMe: false,
        isGroup: false,
      }],
      page: 1,
      pageSize: 50,
    });
    whatsappMocks.listMessages.mockReturnValue({
      messages: [{
        id: 'msg-1',
        chatJid: '15551234567@s.whatsapp.net',
        chatName: 'Contact One',
        sender: '15551234567',
        senderName: 'Contact One',
        content: 'Hello from Contact One',
        timestamp: '2026-04-01T09:00:00Z',
        isFromMe: false,
        mediaType: '',
      }],
      page: 1,
      pageSize: 50,
    });
  });

  it('saves whatsapp settings and revalidates pages', async () => {
    const formData = new FormData();
    formData.set('db_path', '/path/to/messages.db');

    const result = await saveWhatsAppSettings(formData);

    expect(result).toEqual({ success: true });
    expect(modelMocks.upsert).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ db_path: '/path/to/messages.db', owner_user_id: 7 }),
      createScope(),
    );
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/data');
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/whatsapp');
  });

  it('rejects empty db_path on save', async () => {
    const formData = new FormData();
    formData.set('db_path', '');

    const result = await saveWhatsAppSettings(formData);
    expect(result.success).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors![0].field).toBe('db_path');
  });

  it('deletes whatsapp settings', async () => {
    const formData = new FormData();
    formData.set('id', '1');

    await deleteWhatsAppSettings(formData);
    expect(modelMocks.remove).toHaveBeenCalledWith({}, 1, createScope());
  });

  it('returns whatsapp settings for UI', async () => {
    const result = await getWhatsAppSettings();
    expect(result).toMatchObject({ id: 1, db_path: '/path/to/messages.db' });
  });

  it('returns null when no settings configured', async () => {
    modelMocks.findByOwner.mockResolvedValue(null);
    const result = await getWhatsAppSettings();
    expect(result).toBeNull();
  });

  it('tests the whatsapp database connection', async () => {
    const result = await testWhatsAppDb();
    expect(result).toEqual({ success: true });
    expect(whatsappMocks.testWhatsAppConnection).toHaveBeenCalledWith('/path/to/messages.db');
  });

  it('returns error when settings not configured for connection test', async () => {
    modelMocks.findByOwner.mockResolvedValue(null);
    const result = await testWhatsAppDb();
    expect(result.success).toBe(false);
    expect(result.error).toContain('No WhatsApp settings configured');
  });

  it('fetches chats with date filtering', async () => {
    const result = await fetchChats('2026-04-01', '2026-04-03', { page: 1, pageSize: 50 });
    expect(result).toEqual({
      success: true,
      chats: [expect.objectContaining({ jid: '15551234567@s.whatsapp.net', name: 'Contact One' })],
      page: 1,
      pageSize: 50,
    });
  });

  it('returns error when settings not configured for chats', async () => {
    modelMocks.findByOwner.mockResolvedValue(null);
    const result = await fetchChats('2026-04-01', '2026-04-03');
    expect(result.success).toBe(false);
    expect(result.error).toContain('No WhatsApp settings configured');
  });

  it('fetches messages for a specific chat', async () => {
    const result = await fetchChatMessages('15551234567@s.whatsapp.net', '2026-04-01', '2026-04-03');
    expect(result).toEqual({
      success: true,
      messages: [expect.objectContaining({ id: 'msg-1', content: 'Hello from Contact One' })],
      chatName: 'Contact One',
      page: 1,
      pageSize: 50,
    });
  });

  it('returns error when settings not configured for messages', async () => {
    modelMocks.findByOwner.mockResolvedValue(null);
    const result = await fetchChatMessages('15551234567@s.whatsapp.net', '2026-04-01', '2026-04-03');
    expect(result.success).toBe(false);
    expect(result.error).toContain('No WhatsApp settings configured');
  });

  it('surfaces validation errors from chat jid', async () => {
    whatsappMocks.validateChatJid.mockImplementation(() => {
      throw new Error('Invalid chat JID');
    });
    const result = await fetchChatMessages('bad', '2026-04-01', '2026-04-03');
    expect(result).toEqual({ success: false, error: 'Invalid chat JID' });
  });

  it('surfaces lib-layer errors for fetchChats', async () => {
    whatsappMocks.listChats.mockImplementation(() => {
      throw new Error('Database is locked');
    });
    const result = await fetchChats('2026-04-01', '2026-04-03');
    expect(result).toEqual({ success: false, error: 'Database is locked' });
  });
});
