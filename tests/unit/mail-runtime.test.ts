import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { access, chmod, mkdir, readFile, readdir, rm, writeFile } from 'fs/promises';
import path from 'path';
import type { MailSetting } from '../../types';

const fakeBinDir = path.join(process.cwd(), 'storage', '.test-bins');
const fakeBinPath = path.join(fakeBinDir, 'fake-himalaya.js');
const fakeLogPath = path.join(fakeBinDir, 'fake-himalaya.log');
const tempConfigDir = path.join(process.cwd(), 'storage', '.mail-configs');
const attachmentDir = path.join(process.cwd(), 'storage', 'mail-attachments');

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

async function loadMailModule() {
  vi.resetModules();
  process.env.HIMALAYA_BIN = fakeBinPath;
  process.env.HIMALAYA_TEST_LOG = fakeLogPath;
  return import('../../lib/mail');
}

describe.sequential('mail runtime integration', () => {
  beforeAll(async () => {
    await mkdir(fakeBinDir, { recursive: true });
    await writeFile(
      fakeBinPath,
      `#!/usr/bin/env node
const { appendFileSync, mkdirSync, writeFileSync } = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args.slice(2);
const mode = process.env.HIMALAYA_TEST_MODE || 'default';

if (process.env.HIMALAYA_TEST_LOG) {
  appendFileSync(process.env.HIMALAYA_TEST_LOG, JSON.stringify(command) + '\\n');
}

function out(value) {
  process.stdout.write(value);
}

function fail(message) {
  process.stderr.write(message);
  process.exit(1);
}

if (mode === 'auth_fail') {
  fail('authentication failed');
}

if (command[0] === 'folder' && command[1] === 'list') {
  out(JSON.stringify([{ name: 'INBOX', desc: 'Inbox' }]));
  process.exit(0);
}

if (command[0] === 'envelope' && command[1] === 'list') {
  out(JSON.stringify([
    {
      id: 'inside-window',
      subject: 'Inside',
      from: { name: 'Sender One', addr: 'sender.one@example.test' },
      to: { name: 'Recipient One', addr: 'recipient.one@example.test' },
      date: '2026-04-01T10:00:00Z',
      has_attachment: false,
      flags: ['seen']
    },
    {
      id: 'outside-window',
      subject: 'Outside',
      from: { name: 'Sender Two', addr: 'sender.two@example.test' },
      to: { name: 'Recipient Two', addr: 'recipient.two@example.test' },
      date: '2026-05-01T10:00:00Z',
      has_attachment: true,
      flags: []
    }
  ]));
  process.exit(0);
}

if (command[0] === 'envelope' && command[1] === 'thread') {
  if (command.includes('--page') || command.includes('--page-size')) {
    fail("unexpected argument '--page'");
  }

  const idIndex = command.indexOf('--id');
  const idValue = idIndex !== -1 ? command[idIndex + 1] : null;

  // Himalaya envelope thread returns graph-edge tuples: [parent, child, weight]
  // The virtual root node has id "0" with empty fields.
  const root = { id: '0', 'message-id': '0', from: '', subject: '', date: '', flags: [], 'has-attachment': false };

  if (idValue) {
    const child = {
      id: idValue,
      'message-id': '<' + idValue + '@example.com>',
      from: 'Sender One',
      subject: 'Thread for ' + idValue,
      date: '2026-04-01T10:00:00Z',
      flags: [],
      'has-attachment': false
    };
    out(JSON.stringify([ [root, child, 1] ]));
    process.exit(0);
  }

  const child1 = {
    id: 'thread-1',
    'message-id': '<thread-1@example.test>',
    from: 'Sender One',
    subject: 'Thread envelope',
    date: '2026-04-01T10:00:00Z',
    flags: ['flagged'],
    'has-attachment': true
  };
  out(JSON.stringify([ [root, child1, 1] ]));
  process.exit(0);
}

if (command[0] === 'message' && command[1] === 'read') {
  if (command.includes('--output') && mode === 'message_read_unsupported_output') {
    fail("unexpected argument '--output'");
  }

  if (command.includes('--headers')) {
    fail("unexpected argument '--headers'");
  }

  if (command.includes('--output')) {
    out(JSON.stringify({
      message: {
        id: '42',
        subject: 'Structured subject',
        from: [{ name: 'Sender One', addr: 'sender.one@example.test' }],
        to: [{ name: 'Recipient One', addr: 'recipient.one@example.test' }],
        cc: [{ addr: 'operator@example.test' }],
        date: '2026-04-01T10:00:00Z',
        body: { text: 'Structured body' },
        has_attachment: true
      }
    }));
    process.exit(0);
  }

  const headerValues = command
    .flatMap((arg, index) => (arg === '--header' ? [command[index + 1]] : []))
    .filter(Boolean);

  if (!command.includes('--preview')) {
    fail("missing expected argument '--preview'");
  }

  if (headerValues.join(',') !== 'From,To,Cc,Subject,Date') {
    fail('unexpected headers');
  }

  out([
    'Subject: =?UTF-8?B?U3RhdHVzIOKckw==?=',
    'From: Sender One <sender.one@example.test>',
    'To: Recipient One <recipient.one@example.test>',
    'Cc: =?US-ASCII?Q?Operator?= <operator@example.test>',
    'Date: Tue, 01 Apr 2026 10:00:00 +0000',
    '',
    'Fallback body'
  ].join('\\n'));
  process.exit(0);
}

if (command[0] === 'message' && command[1] === 'thread') {
  if (command.includes('--output') && mode === 'message_thread_unsupported_output') {
    fail("unexpected argument '--output'");
  }

  if (!command.includes('--preview')) {
    fail("missing expected argument '--preview'");
  }

  if (command.includes('--output')) {
    out(JSON.stringify({
      messages: [
        {
          id: '42',
          subject: 'First reply',
          from: [{ name: 'Sender One', addr: 'sender.one@example.test' }],
          to: [{ name: 'Recipient One', addr: 'recipient.one@example.test' }],
          date: '2026-04-01T10:00:00Z',
          body: 'Body one',
          has_attachment: false
        },
        {
          id: '43',
          subject: 'Second reply',
          from: [{ name: 'Recipient One', addr: 'recipient.one@example.test' }],
          to: [{ name: 'Sender One', addr: 'sender.one@example.test' }],
          date: '2026-04-01T11:00:00Z',
          body: 'Body two',
          has_attachment: true
        }
      ]
    }));
    process.exit(0);
  }

  out([
    'Subject: First reply',
    'From: Sender One <sender.one@example.test>',
    'To: Recipient One <recipient.one@example.test>',
    '',
    'Body one',
    '---',
    'Subject: Second reply',
    'From: Recipient One <recipient.one@example.test>',
    'To: Sender One <sender.one@example.test>',
    '',
    'Body two'
  ].join('\\n'));
  process.exit(0);
}

if (command[0] === 'message' && command[1] === 'export') {
  const destinationIndex = command.indexOf('--destination');
  const destination = destinationIndex === -1 ? undefined : command[destinationIndex + 1];

  if (!command.includes('--full')) {
    fail("missing expected argument '--full'");
  }

  if (!destination) {
    fail("missing expected argument '--destination'");
  }

  mkdirSync(path.dirname(destination), { recursive: true });
  writeFileSync(destination, 'RAW MESSAGE');
  process.exit(0);
}

if (command[0] === 'attachment' && command[1] === 'download') {
  if (mode === 'attachment_fail') {
    fail('authentication failed');
  }

  if (command.includes('--dir')) {
    fail("unexpected argument '--dir'");
  }

  const dirIndex = command.indexOf('--downloads-dir');
  const downloadDir = command[dirIndex + 1];

  if (!downloadDir) {
    fail("missing expected argument '--downloads-dir'");
  }

  mkdirSync(downloadDir, { recursive: true });
  writeFileSync(path.join(downloadDir, 'invoice.pdf'), 'payload');
  process.exit(0);
}

if (command[0] === 'account' && command[1] === 'doctor') {
  out('doctor ok');
  process.exit(0);
}

fail('unexpected fake himalaya invocation');
`,
    );
    await chmod(fakeBinPath, 0o755);
  });

  afterEach(async () => {
    delete process.env.HIMALAYA_TEST_MODE;
    delete process.env.HIMALAYA_BIN;
    delete process.env.HIMALAYA_TEST_LOG;
    await rm(fakeLogPath, { force: true });
    await rm(tempConfigDir, { recursive: true, force: true });
    await rm(attachmentDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    await rm(fakeBinDir, { recursive: true, force: true });
  });

  it('lists folders and cleans up temporary config files after the CLI call', async () => {
    const mail = await loadMailModule();

    await expect(mail.listFolders(createMailSetting())).resolves.toEqual([
      { name: 'INBOX', desc: 'Inbox' },
    ]);

    await expect(readdir(tempConfigDir)).resolves.toEqual([]);
  });

  it('lists envelopes with date and keyword filtering applied client-side', async () => {
    const mail = await loadMailModule();

    const result = await mail.listEnvelopes(createMailSetting(), 'INBOX', {
      dateFrom: '2026-04-01',
      dateTo: '2026-04-02',
      page: 2,
      pageSize: 10,
      query: 'sender inside',
    });

    expect(result).toEqual({
      envelopes: [expect.objectContaining({ id: 'inside-window', from: 'Sender One <sender.one@example.test>', to: 'Recipient One <recipient.one@example.test>', flags: ['seen'] })],
      page: 2,
      pageSize: 10,
    });

    // Query is NOT forwarded to the CLI — only client-side filtering is used
    const logLines = (await readFile(fakeLogPath, 'utf8')).trim().split('\n');
    const command = JSON.parse(logLines[0]) as string[];
    expect(command).not.toContain('--');
  });

  it('applies case-insensitive client-side keyword filtering on envelopes', async () => {
    const mail = await loadMailModule();

    // "sender one" matches only the first envelope's from field case-insensitively
    const matchResult = await mail.listEnvelopes(createMailSetting(), 'INBOX', { query: 'SENDER ONE' });
    expect(matchResult.envelopes).toEqual([
      expect.objectContaining({ id: 'inside-window', from: 'Sender One <sender.one@example.test>' }),
    ]);

    // "nonexistent" matches nothing
    const noResult = await mail.listEnvelopes(createMailSetting(), 'INBOX', { query: 'nonexistent' });
    expect(noResult.envelopes).toEqual([]);
  });

  it('applies case-insensitive client-side keyword filtering on threaded envelopes', async () => {
    const mail = await loadMailModule();

    const matchResult = await mail.listEnvelopeThreads(createMailSetting(), 'INBOX', { query: 'THREAD' });
    expect(matchResult.envelopes).toEqual([
      expect.objectContaining({ id: 'thread-1', subject: 'Thread envelope' }),
    ]);

    const noResult = await mail.listEnvelopeThreads(createMailSetting(), 'INBOX', { query: 'nonexistent' });
    expect(noResult.envelopes).toEqual([]);
  });

  it('lists threaded envelopes through the CLI JSON output, skipping virtual root', async () => {
    const mail = await loadMailModule();

    const result = await mail.listEnvelopeThreads(createMailSetting(), 'INBOX');
    expect(result).toEqual({
      envelopes: [expect.objectContaining({ id: 'thread-1', subject: 'Thread envelope', from: 'Sender One', hasAttachment: true })],
      page: 1,
      pageSize: 50,
    });
    // Virtual root (id "0") must not appear
    expect(result.envelopes.find((e) => e.id === '0')).toBeUndefined();

    const logLines = (await readFile(fakeLogPath, 'utf8')).trim().split('\n');
    const command = JSON.parse(logLines[0]) as string[];
    expect(command).not.toContain('--page');
    expect(command).not.toContain('--page-size');
  });

  it('passes --id through to envelope thread', async () => {
    const mail = await loadMailModule();

    const idResult = await mail.listEnvelopeThreads(createMailSetting(), 'INBOX', { id: 'env-99' });
    expect(idResult).toEqual({
      envelopes: [expect.objectContaining({ id: 'env-99', subject: 'Thread for env-99', from: 'Sender One' })],
      page: 1,
      pageSize: 50,
    });
    expect(idResult.envelopes.find((e) => e.id === '0')).toBeUndefined();

    const logLines = (await readFile(fakeLogPath, 'utf8')).trim().split('\n');
    const command = JSON.parse(logLines[0]) as string[];
    const idIndex = command.indexOf('--id');
    expect(idIndex).toBeGreaterThan(-1);
    expect(command[idIndex + 1]).toBe('env-99');

  });

  it('reads structured messages and falls back to plain parsing when json output is unsupported', async () => {
    let mail = await loadMailModule();

    await expect(mail.readMessage(createMailSetting(), 'INBOX', '42')).resolves.toEqual(
      expect.objectContaining({
        id: '42',
        subject: 'Structured subject',
        body: 'Structured body',
        hasAttachment: true,
      }),
    );

    await rm(fakeLogPath, { force: true });
    process.env.HIMALAYA_TEST_MODE = 'message_read_unsupported_output';
    mail = await loadMailModule();

    await expect(mail.readMessage(createMailSetting(), 'INBOX', '42')).resolves.toEqual(
      expect.objectContaining({
        id: '42',
        subject: 'Status ✓',
        cc: 'Operator <operator@example.test>',
        body: 'Fallback body',
        hasAttachment: false,
      }),
    );

    const logLines = (await readFile(fakeLogPath, 'utf8')).trim().split('\n');
    expect(logLines).toHaveLength(2);

    const fallbackCommand = JSON.parse(logLines[1]) as string[];
    expect(fallbackCommand).toContain('--preview');
    expect(fallbackCommand).not.toContain('--headers');
    expect(
      fallbackCommand.flatMap((arg, index) => (arg === '--header' ? [fallbackCommand[index + 1]] : [])),
    ).toEqual(['From', 'To', 'Cc', 'Subject', 'Date']);
  });

  it('reads message threads from structured output and falls back to plain thread parsing when needed', async () => {
    let mail = await loadMailModule();

    await expect(mail.readMessageThread(createMailSetting(), 'INBOX', '42')).resolves.toEqual([
      expect.objectContaining({ id: '42', subject: 'First reply' }),
      expect.objectContaining({ id: '43', subject: 'Second reply', hasAttachment: true }),
    ]);

    process.env.HIMALAYA_TEST_MODE = 'message_thread_unsupported_output';
    mail = await loadMailModule();

    await expect(mail.readMessageThread(createMailSetting(), 'INBOX', '42')).resolves.toEqual([
      expect.objectContaining({ id: '42', subject: 'First reply' }),
      expect.objectContaining({ id: '42:2', subject: 'Second reply' }),
    ]);

    const logLines = (await readFile(fakeLogPath, 'utf8')).trim().split('\n');
    const fallbackCommand = JSON.parse(logLines[2]) as string[];
    expect(fallbackCommand).toContain('--preview');
  });

  it('exports raw messages via a temporary .eml destination and runs account diagnostics through the CLI wrapper', async () => {
    const mail = await loadMailModule();

    await expect(mail.exportMessage(createMailSetting(), 'INBOX', '42')).resolves.toBe('RAW MESSAGE');
    await expect(mail.diagnoseAccount(createMailSetting())).resolves.toBe('doctor ok');

    const logLines = (await readFile(fakeLogPath, 'utf8')).trim().split('\n');
    const exportCommand = JSON.parse(logLines[0]) as string[];
    expect(exportCommand).toContain('--full');

    const destinationIndex = exportCommand.indexOf('--destination');
    expect(destinationIndex).toBeGreaterThan(-1);
    const destination = exportCommand[destinationIndex + 1];
    await expect(access(destination)).rejects.toThrow();
  });

  it('downloads attachments on success and removes partial download directories on failure', async () => {
    let mail = await loadMailModule();

    const downloadDir = await mail.downloadAttachments(createMailSetting(), 'INBOX', '42');
    await expect(access(path.join(downloadDir, 'invoice.pdf'))).resolves.toBeUndefined();

    const successLogLines = (await readFile(fakeLogPath, 'utf8')).trim().split('\n');
    const successCommand = JSON.parse(successLogLines[0]) as string[];
    expect(successCommand).toContain('--downloads-dir');
    expect(successCommand).not.toContain('--dir');

    await rm(attachmentDir, { recursive: true, force: true });
    process.env.HIMALAYA_TEST_MODE = 'attachment_fail';
    mail = await loadMailModule();

    await expect(mail.downloadAttachments(createMailSetting(), 'INBOX', '42')).rejects.toThrow(
      'Mail authentication failed',
    );

    await expect(readdir(attachmentDir)).resolves.toEqual([]);
  });

  it('maps connection failures into sanitized user-facing results', async () => {
    process.env.HIMALAYA_TEST_MODE = 'auth_fail';
    const mail = await loadMailModule();

    await expect(mail.testConnection(createMailSetting())).resolves.toEqual({
      success: false,
      error: 'Mail authentication failed',
    });
  });
});
