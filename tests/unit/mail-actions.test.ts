import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import type { AccessScope, MailSetting } from '../../types';

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

const encryptionMocks = vi.hoisted(() => ({
  encrypt: vi.fn(),
}));

const authMocks = vi.hoisted(() => ({
  createSignedAttachmentDownloadToken: vi.fn(),
}));

const mailMocks = vi.hoisted(() => ({
  cleanupStaleAttachments: vi.fn(),
  decryptMailSetting: vi.fn(),
  diagnoseAccount: vi.fn(),
  downloadAttachments: vi.fn(),
  exportMessage: vi.fn(),
  listEnvelopeThreads: vi.fn(),
  listEnvelopes: vi.fn(),
  listFolders: vi.fn(),
  readMessage: vi.fn(),
  readMessageThread: vi.fn(),
  testConnection: vi.fn(),
  validateMailEnvelopeId: vi.fn(),
  validateMailFolder: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: cacheMocks.revalidatePath,
}));

vi.mock('@/lib/access', () => ({
  ownerUserIdFromScope: accessMocks.ownerUserIdFromScope,
  requireAccessScope: accessMocks.requireAccessScope,
}));

vi.mock('@/models/mail-setting.model', () => ({
  findByOwner: modelMocks.findByOwner,
  remove: modelMocks.remove,
  upsert: modelMocks.upsert,
}));

vi.mock('@/lib/db', () => ({
  default: {},
}));

vi.mock('@/lib/config', () => ({
  default: {
    vaultEncryptionKey: Buffer.from('a'.repeat(64), 'hex'),
  },
}));

vi.mock('@/lib/encryption', () => ({
  encrypt: encryptionMocks.encrypt,
}));

vi.mock('@/lib/auth', () => ({
  createSignedAttachmentDownloadToken: authMocks.createSignedAttachmentDownloadToken,
}));

vi.mock('@/lib/mail', () => ({
  cleanupStaleAttachments: mailMocks.cleanupStaleAttachments,
  ensureAttachmentCleanupScheduled: vi.fn(),
  decryptMailSetting: mailMocks.decryptMailSetting,
  diagnoseAccount: mailMocks.diagnoseAccount,
  downloadAttachments: mailMocks.downloadAttachments,
  exportMessage: mailMocks.exportMessage,
  listEnvelopeThreads: mailMocks.listEnvelopeThreads,
  listEnvelopes: mailMocks.listEnvelopes,
  listFolders: mailMocks.listFolders,
  readMessage: mailMocks.readMessage,
  readMessageThread: mailMocks.readMessageThread,
  testConnection: mailMocks.testConnection,
  validateMailEnvelopeId: mailMocks.validateMailEnvelopeId,
  validateMailFolder: mailMocks.validateMailFolder,
}));

import {
  deleteMailSettings,
  diagnoseMailAccount,
  fetchAttachments,
  fetchEnvelopeThreads,
  fetchEnvelopes,
  fetchMailFolders,
  fetchMessage,
  fetchMessageRaw,
  fetchMessageThread,
  getMailSettings,
  saveMailSettings,
  testMailConnection,
} from '../../actions/mail';

function createScope(overrides: Partial<AccessScope> = {}): AccessScope {
  return {
    userId: 7,
    role: 'operator',
    ...overrides,
  };
}

function createMailSetting(overrides: Partial<MailSetting> = {}): MailSetting {
  return {
    id: 1,
    owner_user_id: 7,
    imap_host: 'imap.example.com',
    imap_port: 993,
    imap_encryption: 'tls',
    imap_login: 'operator@example.test',
    imap_password: 'encrypted-password',
    email: 'operator@example.test',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createValidFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const fields = {
    imap_host: 'imap.example.com',
    imap_port: '993',
    imap_encryption: 'tls',
    imap_login: 'operator@example.test',
    imap_password: 'super-secret-password',
    email: 'operator@example.test',
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    data.set(key, value);
  }

  return data;
}

describe.sequential('mail actions', () => {
  const attachmentRoot = path.join(process.cwd(), 'storage', '.mail-action-tests');

  beforeEach(() => {
    vi.clearAllMocks();

    accessMocks.requireAccessScope.mockResolvedValue(createScope());
    accessMocks.ownerUserIdFromScope.mockReturnValue(7);
    encryptionMocks.encrypt.mockReturnValue({
      ct: 'enc',
      iv: 'iv',
      tag: 'tag',
    });

    modelMocks.findByOwner.mockResolvedValue(createMailSetting());
    modelMocks.remove.mockResolvedValue(undefined);
    modelMocks.upsert.mockResolvedValue(undefined);

    mailMocks.cleanupStaleAttachments.mockResolvedValue(undefined);
    mailMocks.decryptMailSetting.mockImplementation(async (setting: MailSetting) => ({
      ...setting,
      imap_password: 'super-secret-password',
    }));
    mailMocks.diagnoseAccount.mockResolvedValue('doctor ok');
    mailMocks.downloadAttachments.mockResolvedValue(path.join(attachmentRoot, 'download-123'));
    mailMocks.exportMessage.mockResolvedValue('raw message');
    mailMocks.listEnvelopeThreads.mockResolvedValue({
      envelopes: [{ id: 't-1', subject: 'Thread', from: 'A', to: 'B', date: '2026-04-02T00:00:00Z', folder: 'INBOX', hasAttachment: false, flags: [] }],
      page: 1,
      pageSize: 50,
    });
    mailMocks.listEnvelopes.mockResolvedValue({
      envelopes: [],
      page: 1,
      pageSize: 50,
    });
    mailMocks.listFolders.mockResolvedValue([{ name: 'INBOX', desc: 'Inbox' }]);
    mailMocks.readMessage.mockResolvedValue({
      id: '42',
      subject: 'Subject',
      from: 'Sender One <sender.one@example.test>',
      to: 'Recipient One <recipient.one@example.test>',
      cc: '',
      date: '2026-04-01T00:00:00Z',
      body: 'Hello',
      folder: 'INBOX',
      hasAttachment: false,
    });
    mailMocks.readMessageThread.mockResolvedValue([{
      id: '42',
      subject: 'Subject',
      from: 'Sender One <sender.one@example.test>',
      to: 'Recipient One <recipient.one@example.test>',
      cc: '',
      date: '2026-04-01T00:00:00Z',
      body: 'Hello',
      folder: 'INBOX',
      hasAttachment: false,
    }]);
    mailMocks.testConnection.mockResolvedValue({ success: true });
    mailMocks.validateMailEnvelopeId.mockImplementation((value: unknown) => String(value));
    mailMocks.validateMailFolder.mockImplementation((value: unknown) => String(value));

    authMocks.createSignedAttachmentDownloadToken.mockResolvedValue('signed-token');
  });

  afterEach(async () => {
    await rm(attachmentRoot, { recursive: true, force: true });
  });

  it('saves new mail settings with encrypted passwords and revalidates mail pages', async () => {
    const result = await saveMailSettings(createValidFormData());

    expect(result).toEqual({ success: true });
    expect(encryptionMocks.encrypt).toHaveBeenCalledWith(
      'super-secret-password',
      expect.any(Buffer),
    );
    expect(modelMocks.upsert).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        owner_user_id: 7,
        imap_password: JSON.stringify({
          ct: 'enc',
          iv: 'iv',
          tag: 'tag',
        }),
      }),
      createScope(),
    );
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/data');
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/mail');
  });

  it('preserves the existing encrypted password on update and rejects missing passwords for first-time setup', async () => {
    const preservePasswordResult = await saveMailSettings(createValidFormData({
      imap_password: '',
    }));

    expect(preservePasswordResult).toEqual({ success: true });
    expect(modelMocks.upsert).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        imap_password: 'encrypted-password',
      }),
      createScope(),
    );

    modelMocks.findByOwner.mockResolvedValueOnce(null);

    const missingPasswordResult = await saveMailSettings(createValidFormData({
      imap_password: '',
    }));

    expect(missingPasswordResult).toEqual({
      success: false,
      errors: [{ field: 'imap_password', message: 'Password is required' }],
    });
  });

  it('strips stored passwords from getMailSettings responses', async () => {
    const result = await getMailSettings();

    expect(result).toEqual(expect.objectContaining({
      id: 1,
      email: 'operator@example.test',
      imap_host: 'imap.example.com',
    }));
    expect(result).not.toHaveProperty('imap_password');
  });

  it('deletes mail settings and revalidates affected routes', async () => {
    const formData = new FormData();
    formData.set('id', '42');

    await deleteMailSettings(formData);

    expect(modelMocks.remove).toHaveBeenCalledWith({}, 42, createScope());
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/data');
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith('/mail');
  });

  it('fails closed when stored credentials cannot be decrypted for connection-oriented actions', async () => {
    mailMocks.decryptMailSetting.mockRejectedValue(new Error('Stored mail credentials are unreadable. Re-save your mail settings.'));

    await expect(testMailConnection()).resolves.toEqual({
      success: false,
      error: 'Stored mail credentials are unreadable. Re-save your mail settings.',
    });

    await expect(fetchMailFolders()).resolves.toEqual({
      success: false,
      error: 'Stored mail credentials are unreadable. Re-save your mail settings.',
    });
  });

  it('returns missing-settings errors for diagnostic and folder operations', async () => {
    modelMocks.findByOwner.mockResolvedValue(null);

    await expect(diagnoseMailAccount()).resolves.toEqual({
      success: false,
      error: 'No mail settings configured.',
    });

    await expect(fetchMailFolders()).resolves.toEqual({
      success: false,
      error: 'No mail settings configured.',
    });
  });

  it('diagnoses accounts and returns fetched folders when settings are present', async () => {
    await expect(diagnoseMailAccount()).resolves.toEqual({
      success: true,
      output: 'doctor ok',
    });

    await expect(fetchMailFolders()).resolves.toEqual({
      success: true,
      folders: [{ name: 'INBOX', desc: 'Inbox' }],
    });
  });

  it('surfaces thread-list failures from the hardened mail layer', async () => {
    mailMocks.listEnvelopeThreads.mockRejectedValue(new Error('Mail folder not found'));

    await expect(fetchEnvelopeThreads('INBOX')).resolves.toEqual({
      success: false,
      error: 'Mail folder not found',
    });
  });

  it('merges and sorts envelopes across folders and rejects invalid folder sets', async () => {
    mailMocks.listEnvelopes
      .mockResolvedValueOnce({
        envelopes: [{
          id: 'older',
          subject: 'Older',
          from: 'Alice',
          to: 'Bob',
          date: '2026-04-01T09:00:00Z',
          folder: 'INBOX',
          hasAttachment: false,
          flags: [],
        }],
        page: 2,
        pageSize: 10,
      })
      .mockResolvedValueOnce({
        envelopes: [{
          id: 'newer',
          subject: 'Newer',
          from: 'Carol',
          to: 'Dave',
          date: '2026-04-02T09:00:00Z',
          folder: 'Sent',
          hasAttachment: true,
          flags: ['seen'],
        }],
        page: 2,
        pageSize: 10,
      });

    const result = await fetchEnvelopes(['INBOX', 'Sent'], '2026-04-01', '2026-04-02', {
      page: 2,
      pageSize: 10,
      query: 'status:unread',
    });

    expect(result).toEqual({
      success: true,
      envelopes: [
        expect.objectContaining({ id: 'newer' }),
        expect.objectContaining({ id: 'older' }),
      ],
      page: 2,
      pageSize: 10,
    });

    mailMocks.validateMailFolder.mockImplementation(() => {
      throw new Error('Invalid folder name');
    });

    await expect(fetchEnvelopes(['\n'], '2026-04-01', '2026-04-02')).resolves.toEqual({
      success: false,
      error: 'At least one folder is required.',
    });
  });

  it('validates and dispatches thread, message, and raw-read actions through the hardened mail layer', async () => {
    const threadResult = await fetchEnvelopeThreads('INBOX');
    expect(threadResult).toEqual({
      success: true,
      envelopes: [expect.objectContaining({ id: 't-1' })],
    });

    const messageResult = await fetchMessage('INBOX', '42');
    expect(messageResult).toEqual({
      success: true,
      message: expect.objectContaining({ id: '42', body: 'Hello' }),
    });

    const threadMessagesResult = await fetchMessageThread('INBOX', '42');
    expect(threadMessagesResult).toEqual({
      success: true,
      messages: [expect.objectContaining({ id: '42' })],
    });

    const rawResult = await fetchMessageRaw('INBOX', '42');
    expect(rawResult).toEqual({
      success: true,
      raw: 'raw message',
    });

    expect(mailMocks.validateMailFolder).toHaveBeenCalledWith('INBOX');
    expect(mailMocks.validateMailEnvelopeId).toHaveBeenCalledWith('42');
  });

  it('surfaces validation failures from thread and message reads', async () => {
    mailMocks.validateMailFolder.mockImplementation(() => {
      throw new Error('Invalid folder name');
    });

    await expect(fetchEnvelopeThreads('bad')).resolves.toEqual({
      success: false,
      error: 'A valid folder name is required.',
    });

    await expect(fetchMessage('bad', '42')).resolves.toEqual({
      success: false,
      error: 'Invalid folder name',
    });
  });

  it('returns missing-settings and decryption failures for message reads', async () => {
    modelMocks.findByOwner.mockResolvedValue(null);

    await expect(fetchMessage('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'No mail settings configured.',
    });

    modelMocks.findByOwner.mockResolvedValue(createMailSetting());
    mailMocks.decryptMailSetting.mockRejectedValue(new Error('Stored mail credentials are unreadable. Re-save your mail settings.'));

    await expect(fetchMessage('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'Stored mail credentials are unreadable. Re-save your mail settings.',
    });

    await expect(fetchMessageThread('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'Stored mail credentials are unreadable. Re-save your mail settings.',
    });
  });

  it('surfaces thread-read failures and missing-settings states for thread/raw handlers', async () => {
    mailMocks.readMessageThread.mockRejectedValue(new Error('Mail command failed'));

    await expect(fetchMessageThread('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'Mail command failed',
    });

    modelMocks.findByOwner.mockResolvedValue(null);

    await expect(fetchMessageThread('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'No mail settings configured.',
    });

    await expect(fetchMessageRaw('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'No mail settings configured.',
    });

    modelMocks.findByOwner.mockResolvedValue(createMailSetting());
    mailMocks.decryptMailSetting.mockRejectedValue(new Error('Stored mail credentials are unreadable. Re-save your mail settings.'));

    await expect(fetchMessageRaw('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'Stored mail credentials are unreadable. Re-save your mail settings.',
    });
  });

  it('surfaces raw export failures without leaking internal exceptions', async () => {
    mailMocks.exportMessage.mockRejectedValue(new Error('Mail folder not found'));

    await expect(fetchMessageRaw('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'Mail folder not found',
    });
  });

  it('lists downloaded attachments with signed per-file authorization tokens', async () => {
    const downloadDir = path.join(attachmentRoot, 'download-123');
    await mkdir(path.join(downloadDir, 'nested-dir'), { recursive: true });
    await writeFile(path.join(downloadDir, 'invoice.pdf'), 'invoice');
    await writeFile(path.join(downloadDir, '.DS_Store'), 'hidden');

    mailMocks.downloadAttachments.mockResolvedValue(downloadDir);

    const result = await fetchAttachments('INBOX', '42');

    expect(result).toEqual({
      success: true,
      downloadId: 'download-123',
      files: [{
        name: 'invoice.pdf',
        size: 7,
        token: 'signed-token',
      }],
    });

    expect(mailMocks.cleanupStaleAttachments).toHaveBeenCalled();
    expect(authMocks.createSignedAttachmentDownloadToken).toHaveBeenCalledWith(
      expect.objectContaining({
        downloadId: 'download-123',
        filename: 'invoice.pdf',
        ownerUserId: 7,
        expiresAt: expect.any(Number),
      }),
      process.env,
    );
  });

  it('fails closed for attachment downloads when settings are invalid or missing', async () => {
    mailMocks.decryptMailSetting.mockRejectedValue(new Error('Stored mail credentials are unreadable. Re-save your mail settings.'));

    await expect(fetchAttachments('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'Stored mail credentials are unreadable. Re-save your mail settings.',
    });

    mailMocks.decryptMailSetting.mockResolvedValue({
      ...createMailSetting(),
      imap_password: 'super-secret-password',
    });
    modelMocks.findByOwner.mockResolvedValue(null);

    await expect(fetchAttachments('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'No mail settings configured.',
    });
  });

  it('returns attachment download errors from the hardened mail layer', async () => {
    mailMocks.downloadAttachments.mockRejectedValue(new Error('Mail authentication failed'));

    await expect(fetchAttachments('INBOX', '42')).resolves.toEqual({
      success: false,
      error: 'Mail authentication failed',
    });
  });
});
