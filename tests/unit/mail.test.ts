import { describe, expect, it } from 'vitest';
import type { MailSetting } from '../../types';
import { encrypt } from '../../lib/encryption';
import {
  buildTomlConfig,
  classifyHimalayaError,
  decryptMailSetting,
  getHimalayaEnv,
  parseMessageOutput,
  parseThreadMessages,
  validateMailEnvelopeId,
  validateMailFolder,
} from '../../lib/mail';

function createMailSetting(overrides: Partial<MailSetting> = {}): MailSetting {
  return {
    id: 1,
    owner_user_id: 1,
    imap_host: 'imap.example.com',
    imap_port: 993,
    imap_encryption: 'tls',
    imap_login: 'operator@example.test',
    imap_password: 'super-secret-password',
    email: 'operator@example.test',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('mail config helpers', () => {
  it('keeps the IMAP password out of the temp TOML file and passes it via env', () => {
    const setting = createMailSetting();

    const config = buildTomlConfig(setting);
    const env = getHimalayaEnv(setting, {});

    expect(config).toContain('backend.auth.type = "password"');
    expect(config).toContain('backend.auth.cmd = "printf');
    expect(config).not.toContain('backend.auth.raw');
    expect(config).not.toContain(setting.imap_password);
    expect(env.CODEX_HIMALAYA_IMAP_PASSWORD).toBe(setting.imap_password);
  });

  it('decrypts a stored mail setting and fails closed on invalid ciphertext', async () => {
    const key = Buffer.from('a'.repeat(64), 'hex');
    const encrypted = encrypt('super-secret-password', key);
    const validSetting = createMailSetting({
      imap_password: JSON.stringify(encrypted),
    });

    await expect(
      decryptMailSetting(validSetting, key),
    ).resolves.toMatchObject({
      imap_password: 'super-secret-password',
    });

    const invalidSetting = createMailSetting({
      imap_password: JSON.stringify({
        ct: '2ef7991b63',
        iv: '000000000000000000000000',
        tag: '00000000000000000000000000000000',
      }),
    });

    await expect(
      decryptMailSetting(invalidSetting, key),
    ).rejects.toThrow('Stored mail credentials are unreadable');
  });
});

describe('parseMessageOutput', () => {
  it('parses structured Himalaya message output with array addresses', () => {
    const raw = JSON.stringify({
      id: 'm-1',
      subject: 'Status update',
      from: [{ name: 'Sender One', addr: 'sender.one@example.test' }],
      to: [{ name: 'Recipient One', addr: 'recipient.one@example.test' }],
      cc: [{ addr: 'operator@example.test' }],
      date: '2026-04-01T09:30:00Z',
      body: {
        text: 'Body text',
      },
      has_attachment: true,
    });

    expect(parseMessageOutput(raw, 'INBOX', 'm-1')).toMatchObject({
      id: 'm-1',
      subject: 'Status update',
      from: 'Sender One <sender.one@example.test>',
      to: 'Recipient One <recipient.one@example.test>',
      cc: 'operator@example.test',
      date: '2026-04-01T09:30:00Z',
      body: 'Body text',
      folder: 'INBOX',
      hasAttachment: true,
    });
  });

  it('parses structured Himalaya message output with single-object addresses', () => {
    const raw = JSON.stringify({
      id: 'm-2',
      subject: 'Single object addr',
      from: { name: 'Sender One', addr: 'sender.one@example.test' },
      to: { name: null, addr: 'recipient.one@example.test' },
      cc: { addr: 'operator@example.test' },
      date: '2026-04-01T09:30:00Z',
      body: { text: 'Body text' },
      has_attachment: false,
    });

    expect(parseMessageOutput(raw, 'INBOX', 'm-2')).toMatchObject({
      id: 'm-2',
      from: 'Sender One <sender.one@example.test>',
      to: 'recipient.one@example.test',
      cc: 'operator@example.test',
    });
  });

  it('falls back to plain-message parsing with folded and encoded headers', () => {
    const raw = [
      'Subject: =?UTF-8?Q?Quarterly_=E2=9C=85?=',
      'From: Sender One <sender.one@example.test>',
      'To: Recipient One <recipient.one@example.test>',
      'Cc: Queue <queue@example.test>,',
      ' Operator <operator@example.test>',
      'Date: Tue, 01 Apr 2026 09:30:00 +0000',
      '',
      'Body text',
    ].join('\n');

    expect(parseMessageOutput(raw, 'INBOX', 'm-1')).toMatchObject({
      subject: 'Quarterly ✅',
      cc: 'Queue <queue@example.test>, Operator <operator@example.test>',
      body: 'Body text',
    });
  });

  it('leaves unsupported MIME charsets unchanged instead of corrupting the header', () => {
    const raw = [
      'Subject: =?ISO-8859-1?Q?Caf=E9?=',
      'From: Sender One <sender.one@example.test>',
      '',
      'Body text',
    ].join('\n');

    expect(parseMessageOutput(raw, 'INBOX', 'm-1')).toMatchObject({
      subject: '=?ISO-8859-1?Q?Caf=E9?=',
    });
  });
});

describe('parseThreadMessages', () => {
  it('parses structured Himalaya thread output into individual messages', () => {
    const raw = JSON.stringify([
      {
        id: 'm-1',
        subject: 'First message',
        from: [{ name: 'Sender One', addr: 'sender.one@example.test' }],
        to: [{ name: 'Recipient One', addr: 'recipient.one@example.test' }],
        cc: [{ addr: 'operator@example.test' }],
        date: '2026-04-01T09:30:00Z',
        body: 'Hello recipient',
        has_attachment: true,
      },
      {
        id: 'm-2',
        subject: 'Second message',
        from: [{ name: 'Recipient One', addr: 'recipient.one@example.test' }],
        to: [{ name: 'Sender One', addr: 'sender.one@example.test' }],
        cc: [],
        date: '2026-04-01T10:00:00Z',
        body: 'Hello sender',
        has_attachment: false,
      },
    ]);

    const messages = parseThreadMessages(raw, 'INBOX', 'm-1');

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      id: 'm-1',
      subject: 'First message',
      from: 'Sender One <sender.one@example.test>',
      to: 'Recipient One <recipient.one@example.test>',
      cc: 'operator@example.test',
      date: '2026-04-01T09:30:00Z',
      body: 'Hello recipient',
      folder: 'INBOX',
      hasAttachment: true,
    });
    expect(messages[1]).toMatchObject({
      id: 'm-2',
      subject: 'Second message',
      from: 'Recipient One <recipient.one@example.test>',
      to: 'Sender One <sender.one@example.test>',
      cc: '',
      date: '2026-04-01T10:00:00Z',
      body: 'Hello sender',
      folder: 'INBOX',
      hasAttachment: false,
    });
  });

  it('falls back to a single raw thread message when no structured boundaries can be found', () => {
    expect(parseThreadMessages('unstructured thread body', 'INBOX', 'm-1')).toEqual([
      {
        id: 'm-1',
        subject: '',
        from: '',
        to: '',
        cc: '',
        date: '',
        body: 'unstructured thread body',
        folder: 'INBOX',
        hasAttachment: false,
      },
    ]);
  });
});

describe('mail input validation', () => {
  it('accepts ordinary folder names and envelope IDs', () => {
    expect(validateMailFolder('INBOX/Subfolder')).toBe('INBOX/Subfolder');
    expect(validateMailEnvelopeId('42')).toBe('42');
  });

  it('rejects empty or control-character folder names', () => {
    expect(() => validateMailFolder('')).toThrow('Invalid folder name');
    expect(() => validateMailFolder('INBOX\nSent')).toThrow('Invalid folder name');
  });

  it('rejects envelope IDs with control characters or extreme length', () => {
    expect(() => validateMailEnvelopeId('abc\ndef')).toThrow('Invalid envelope ID');
    expect(() => validateMailEnvelopeId('--output')).toThrow('Invalid envelope ID');
    expect(() => validateMailEnvelopeId('x'.repeat(129))).toThrow('Invalid envelope ID');
  });
});

describe('classifyHimalayaError', () => {
  it('maps common stderr patterns to sanitized user-facing messages', () => {
    expect(classifyHimalayaError({ stderr: 'authentication failed' }).message).toBe('Mail authentication failed');
    expect(classifyHimalayaError({ stderr: 'TLS certificate verify failed' }).message).toBe('Mail TLS/SSL negotiation failed');
    expect(classifyHimalayaError({ stderr: 'mailbox not found' }).message).toBe('Mail folder not found');
    expect(classifyHimalayaError({ stderr: 'unexpected argument \'--output\'' }).kind).toBe('unsupported_output');
    expect(classifyHimalayaError({ killed: true }).message).toBe('Mail command timed out');
  });
});
