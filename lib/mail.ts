import { writeFile, unlink, mkdir, readdir, rm, stat as fsStat, readFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import crypto from 'crypto';
import type { MailSetting, MailEnvelope, MailEnvelopeList, MailMessage, MailFolder } from '@/types';
import { decrypt } from '@/lib/encryption';

const execFileAsync = promisify(execFile);

const HIMALAYA_BIN = process.env.HIMALAYA_BIN || 'himalaya';
export const HIMALAYA_PASSWORD_ENV = 'CODEX_HIMALAYA_IMAP_PASSWORD';
const TEMP_CONFIG_DIR = path.join(process.cwd(), 'storage', '.mail-configs');
export const ATTACHMENT_DIR = path.join(process.cwd(), 'storage', 'mail-attachments');
const EXPORT_DIR = path.join(process.cwd(), 'storage', '.mail-exports');

const MAX_FOLDER_NAME_LENGTH = 256;
const MAX_ENVELOPE_ID_LENGTH = 128;
const MAX_PAGE_SIZE = 100;
const ATTACHMENT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

export function ensureAttachmentCleanupScheduled(): void {
  if (cleanupIntervalId !== null) {
    return;
  }

  cleanupIntervalId = setInterval(() => {
    cleanupStaleAttachments().catch(() => {});
  }, CLEANUP_INTERVAL_MS);

  cleanupIntervalId.unref();
}

export function stopAttachmentCleanup(): void {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

type MailCommandErrorKind =
  | 'auth'
  | 'tls'
  | 'folder_not_found'
  | 'unsupported_output'
  | 'timeout'
  | 'missing_binary'
  | 'buffer_exceeded'
  | 'unknown';

export class MailCommandError extends Error {
  kind: MailCommandErrorKind;

  constructor(kind: MailCommandErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'MailCommandError';
  }
}

// ── TOML escaping ──────────────────────────────────────────────────────────

function escapeTomlString(value: string): string {
  // Escape backslashes first, then quotes, then control characters
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    // Strip any remaining control chars (U+0000–U+001F except those already handled)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');
}

export function buildTomlConfig(setting: MailSetting): string {
  const e = escapeTomlString;
  const passwordCommand = `printf '%s' "$${HIMALAYA_PASSWORD_ENV}"`;
  return `[accounts.default]
default = true
email = "${e(setting.email)}"

backend.type = "imap"
backend.host = "${e(setting.imap_host)}"
backend.port = ${Number(setting.imap_port)}
backend.encryption.type = "${e(setting.imap_encryption)}"
backend.login = "${e(setting.imap_login)}"
backend.auth.type = "password"
backend.auth.cmd = "${e(passwordCommand)}"
`;
}

export function getHimalayaEnv(
  setting: MailSetting,
  baseEnv: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  return {
    ...baseEnv,
    [HIMALAYA_PASSWORD_ENV]: setting.imap_password,
  };
}

export async function decryptMailSetting(setting: MailSetting, key: Buffer): Promise<MailSetting> {
  try {
    const encryptedPayload = JSON.parse(setting.imap_password);
    return {
      ...setting,
      imap_password: decrypt(encryptedPayload, key),
    };
  } catch {
    throw new Error('Stored mail credentials are unreadable. Re-save your mail settings.');
  }
}

// ── Temp config lifecycle ──────────────────────────────────────────────────

async function withTempConfig<T>(
  setting: MailSetting,
  fn: (configPath: string, childEnv: NodeJS.ProcessEnv) => Promise<T>,
): Promise<T> {
  await mkdir(TEMP_CONFIG_DIR, { recursive: true, mode: 0o700 });
  const id = crypto.randomUUID();
  const configPath = path.join(TEMP_CONFIG_DIR, `${id}.toml`);
  try {
    await writeFile(configPath, buildTomlConfig(setting), { mode: 0o600 });
    return await fn(configPath, getHimalayaEnv(setting));
  } finally {
    await unlink(configPath).catch(() => {});
  }
}

// ── CLI runner with error sanitization ─────────────────────────────────────

async function runHimalaya(
  configPath: string,
  args: string[],
  timeoutMs = 30_000,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  try {
    const { stdout } = await execFileAsync(HIMALAYA_BIN, ['-c', configPath, ...args], {
      env,
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout;
  } catch (err: unknown) {
    throw classifyHimalayaError(err);
  }
}

export function classifyHimalayaError(err: unknown): MailCommandError {
  if (err && typeof err === 'object' && 'killed' in err && (err as { killed: boolean }).killed) {
    return new MailCommandError('timeout', 'Mail command timed out');
  }

  const code = err && typeof err === 'object' && 'code' in err ? (err as { code: unknown }).code : undefined;
  if (code === 'ENOENT') {
    return new MailCommandError('missing_binary', 'Mail CLI (himalaya) is not installed or not found in PATH');
  }

  if (code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
    return new MailCommandError('buffer_exceeded', 'Mail command produced too much data');
  }

  const stderr = err && typeof err === 'object' && 'stderr' in err
    ? String((err as { stderr?: unknown }).stderr ?? '')
    : '';
  const normalized = stderr.toLowerCase();

  if (/unexpected argument .*--output|unrecognized option .*--output|unknown option .*--output|invalid value .*output/.test(normalized)) {
    return new MailCommandError('unsupported_output', 'Mail command output format is not supported');
  }

  if (/auth|login failed|invalid credentials|authentication failed|authorization failed/.test(normalized)) {
    return new MailCommandError('auth', 'Mail authentication failed');
  }

  if (/tls|ssl|certificate|starttls/.test(normalized)) {
    return new MailCommandError('tls', 'Mail TLS/SSL negotiation failed');
  }

  if (/mailbox not found|folder not found|unknown mailbox|does not exist/.test(normalized)) {
    return new MailCommandError('folder_not_found', 'Mail folder not found');
  }

  return new MailCommandError('unknown', 'Mail command failed');
}

// ── Input validation helpers ───────────────────────────────────────────────

function clampPage(page: unknown): number {
  const n = Number(page) || 1;
  return Math.max(1, Math.min(n, 10_000));
}

function clampPageSize(size: unknown): number {
  const n = Number(size) || 50;
  return Math.max(1, Math.min(n, MAX_PAGE_SIZE));
}

/**
 * Client-side case-insensitive fuzzy filter.  Every whitespace-separated token
 * in `query` must appear somewhere in the envelope's subject, from, or to
 * fields.  This supplements the IMAP search (which may not support arbitrary
 * keyword matching) so the UI always returns intuitive results.
 */
function envelopeMatchesQuery(envelope: MailEnvelope, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const haystack = `${envelope.subject} ${envelope.from} ${envelope.to}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function validateMailFolder(folder: unknown): string {
  if (typeof folder !== 'string') {
    throw new Error('Invalid folder name');
  }

  if (
    folder.length === 0 ||
    folder.length > MAX_FOLDER_NAME_LENGTH ||
    folder.trim().length === 0 ||
    /[\x00-\x1f\x7f]/.test(folder)
  ) {
    throw new Error('Invalid folder name');
  }

  return folder;
}

export function validateMailEnvelopeId(id: unknown): string {
  const value = String(id ?? '');

  if (
    value.length === 0 ||
    value.length > MAX_ENVELOPE_ID_LENGTH ||
    value.trim().length === 0 ||
    /[\x00-\x1f\x7f]/.test(value) ||
    value.startsWith('-')
  ) {
    throw new Error('Invalid envelope ID');
  }

  return value;
}

// ── Attachment cleanup ─────────────────────────────────────────────────────

export async function cleanupStaleAttachments(): Promise<void> {
  try {
    const entries = await readdir(ATTACHMENT_DIR);
    const now = Date.now();
    for (const entry of entries) {
      const entryPath = path.join(ATTACHMENT_DIR, entry);
      try {
        const info = await fsStat(entryPath);
        if (info.isDirectory() && now - info.mtimeMs > ATTACHMENT_TTL_MS) {
          await rm(entryPath, { recursive: true, force: true }).catch(() => {});
        }
      } catch { /* skip entries that can't be stat'd */ }
    }
  } catch { /* dir may not exist yet */ }
}

// ── Folder operations ──────────────────────────────────────────────────────

export async function listFolders(setting: MailSetting): Promise<MailFolder[]> {
  return withTempConfig(setting, async (configPath, childEnv) => {
    const raw = await runHimalaya(configPath, [
      'folder', 'list',
      '--account', 'default',
      '--output', 'json',
    ], 30_000, childEnv);
    try {
      const folders = JSON.parse(raw);
      return folders.map((f: Record<string, unknown>) => ({
        name: String(f.name ?? ''),
        desc: String(f.desc ?? ''),
      }));
    } catch {
      return [];
    }
  });
}

// ── Envelope operations ────────────────────────────────────────────────────

export async function listEnvelopes(
  setting: MailSetting,
  folder: string,
  opts: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number; query?: string } = {},
): Promise<MailEnvelopeList> {
  return withTempConfig(setting, async (configPath, childEnv) => {
    const page = clampPage(opts.page);
    const pageSize = clampPageSize(opts.pageSize);

    const args = [
      'envelope', 'list',
      '--account', 'default',
      '--folder', folder,
      '--output', 'json',
      '--page', String(page),
      '--page-size', String(pageSize),
    ];

    const raw = await runHimalaya(configPath, args, 30_000, childEnv);
    let parsed: Array<Record<string, unknown>>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { envelopes: [], page, pageSize };
    }

    let envelopes: MailEnvelope[] = parsed.map((e) => ({
      id: String(e.id ?? ''),
      subject: String(e.subject ?? '(no subject)'),
      from: formatAddress(e.from),
      to: formatAddress(e.to),
      date: String(e.date ?? ''),
      folder,
      hasAttachment: Boolean(e.has_attachment),
      flags: Array.isArray(e.flags) ? e.flags.map(String) : [],
    }));

    // Client-side date filtering when dateFrom/dateTo are provided
    if (opts.dateFrom || opts.dateTo) {
      const from = opts.dateFrom ? new Date(opts.dateFrom) : new Date(0);
      const to = opts.dateTo ? new Date(opts.dateTo) : new Date('9999-12-31');
      to.setHours(23, 59, 59, 999);

      envelopes = envelopes.filter((e) => {
        const d = new Date(e.date);
        return d >= from && d <= to;
      });
    }

    // Client-side case-insensitive keyword filtering
    if (opts.query) {
      envelopes = envelopes.filter((e) => envelopeMatchesQuery(e, opts.query!));
    }

    return { envelopes, page, pageSize };
  });
}

export async function listEnvelopeThreads(
  setting: MailSetting,
  folder: string,
  opts: { id?: string; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number; query?: string } = {},
): Promise<MailEnvelopeList> {
  return withTempConfig(setting, async (configPath, childEnv) => {
    const page = clampPage(opts.page);
    const pageSize = clampPageSize(opts.pageSize);

    const args = [
      'envelope', 'thread',
      '--account', 'default',
      '--folder', folder,
      '--output', 'json',
    ];

    if (opts.id) {
      args.push('--id', validateMailEnvelopeId(opts.id));
    }

    const raw = await runHimalaya(configPath, args, 30_000, childEnv);
    let parsed: unknown[];
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { envelopes: [], page, pageSize };
    }

    if (!Array.isArray(parsed)) {
      return { envelopes: [], page, pageSize };
    }

    // Himalaya envelope thread returns an array of [parent, child, weight]
    // graph-edge tuples. Extract unique envelopes from the child position,
    // skipping the virtual root node (id "0" with empty fields).
    // Hard cap to prevent unbounded memory usage on large folders
    const MAX_THREAD_ITEMS = 5000;
    if (parsed.length > MAX_THREAD_ITEMS) {
      parsed = parsed.slice(0, MAX_THREAD_ITEMS);
    }

    const seen = new Set<string>();
    const envelopes: MailEnvelope[] = [];

    for (const item of parsed) {
      if (Array.isArray(item) && item.length >= 2) {
        // Graph edge tuple: [parent, child, weight]
        for (const node of [item[0], item[1]]) {
          if (!node || typeof node !== 'object') continue;
          const e = node as Record<string, unknown>;
          const id = String(e.id ?? '');
          // Skip virtual root (id "0" with empty subject) and duplicates
          if (!id || id === '0' || seen.has(id)) continue;
          seen.add(id);
          envelopes.push({
            id,
            subject: String(e.subject ?? '(no subject)'),
            from: formatAddress(e.from),
            to: formatAddress(e.to),
            date: String(e.date ?? ''),
            folder,
            // Himalaya thread uses kebab-case: "has-attachment"
            hasAttachment: Boolean(e['has-attachment'] ?? e.has_attachment),
            flags: Array.isArray(e.flags) ? e.flags.map(String) : [],
          });
        }
      } else if (item && typeof item === 'object' && !Array.isArray(item)) {
        // Flat envelope object (some Himalaya versions)
        const e = item as Record<string, unknown>;
        const id = String(e.id ?? '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        envelopes.push({
          id,
          subject: String(e.subject ?? '(no subject)'),
          from: formatAddress(e.from),
          to: formatAddress(e.to),
          date: String(e.date ?? ''),
          folder,
          hasAttachment: Boolean(e['has-attachment'] ?? e.has_attachment),
          flags: Array.isArray(e.flags) ? e.flags.map(String) : [],
        });
      }
    }

    // Sort by date descending so newest threads appear first
    envelopes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Client-side date filtering when dateFrom/dateTo are provided
    let filtered = envelopes;
    if (opts.dateFrom || opts.dateTo) {
      const from = opts.dateFrom ? new Date(opts.dateFrom) : new Date(0);
      const to = opts.dateTo ? new Date(opts.dateTo) : new Date('9999-12-31');
      to.setHours(23, 59, 59, 999);

      filtered = envelopes.filter((e) => {
        const d = new Date(e.date);
        return d >= from && d <= to;
      });
    }

    // Client-side case-insensitive keyword filtering
    if (opts.query) {
      filtered = filtered.filter((e) => envelopeMatchesQuery(e, opts.query!));
    }

    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return { envelopes: paginated, page, pageSize };
  });
}

// ── Message operations ─────────────────────────────────────────────────────

export async function readMessage(
  setting: MailSetting,
  folder: string,
  envelopeId: string,
): Promise<MailMessage> {
  return withTempConfig(setting, async (configPath, childEnv) => {
    try {
      const raw = await runHimalaya(configPath, [
        'message', 'read',
        '--account', 'default',
        '--folder', folder,
        '--preview',
        '--output', 'json',
        '--',
        envelopeId,
      ], 30_000, childEnv);

      return parseMessageOutput(raw, folder, envelopeId);
    } catch (err) {
      if (!(err instanceof MailCommandError) || err.kind !== 'unsupported_output') {
        throw err;
      }
    }

    const raw = await runHimalaya(configPath, [
      'message', 'read',
      '--account', 'default',
      '--folder', folder,
      '--preview',
      '--header', 'From',
      '--header', 'To',
      '--header', 'Cc',
      '--header', 'Subject',
      '--header', 'Date',
      '--',
      envelopeId,
    ], 30_000, childEnv);

    return parseMessageOutput(raw, folder, envelopeId);
  });
}

export async function readMessageThread(
  setting: MailSetting,
  folder: string,
  envelopeId: string,
): Promise<MailMessage[]> {
  return withTempConfig(setting, async (configPath, childEnv) => {
    try {
      const raw = await runHimalaya(configPath, [
        'message', 'thread',
        '--account', 'default',
        '--folder', folder,
        '--preview',
        '--output', 'json',
        '--',
        envelopeId,
      ], 30_000, childEnv);

      return parseThreadMessages(raw, folder, envelopeId);
    } catch (err) {
      if (!(err instanceof MailCommandError) || err.kind !== 'unsupported_output') {
        throw err;
      }
    }

    const raw = await runHimalaya(configPath, [
      'message', 'thread',
      '--account', 'default',
      '--folder', folder,
      '--preview',
      '--',
      envelopeId,
    ], 30_000, childEnv);

    return parseThreadMessages(raw, folder, envelopeId);
  });
}

export async function exportMessage(
  setting: MailSetting,
  folder: string,
  envelopeId: string,
): Promise<string> {
  await mkdir(EXPORT_DIR, { recursive: true, mode: 0o700 });
  const exportId = crypto.randomUUID();
  const exportRunDir = path.join(EXPORT_DIR, exportId);
  const destinationPath = path.join(exportRunDir, 'message.eml');

  await mkdir(exportRunDir, { recursive: true, mode: 0o700 });

  try {
    return await withTempConfig(setting, async (configPath, childEnv) => {
      const args = [
        'message', 'export',
        '--account', 'default',
        '--folder', folder,
        '--full',
        '--destination', destinationPath,
        '--',
        envelopeId,
      ];

      await runHimalaya(configPath, args, 60_000, childEnv);
      const info = await fsStat(destinationPath);
      if (info.size > 10 * 1024 * 1024) {
        throw new Error('Message too large to export (exceeds 10 MB)');
      }
      return readFile(destinationPath, 'utf8');
    });
  } finally {
    await rm(exportRunDir, { recursive: true, force: true }).catch(() => {});
  }
}

// ── Attachment operations ──────────────────────────────────────────────────

export async function downloadAttachments(
  setting: MailSetting,
  folder: string,
  envelopeId: string,
): Promise<string> {
  // Create a unique subdirectory for this download
  const downloadId = crypto.randomUUID();
  const downloadDir = path.join(ATTACHMENT_DIR, downloadId);
  await mkdir(downloadDir, { recursive: true });

  try {
    await withTempConfig(setting, async (configPath, childEnv) => {
      const args = [
        'attachment', 'download',
        '--account', 'default',
        '--folder', folder,
        '--downloads-dir', downloadDir,
        '--',
        envelopeId,
      ];

      await runHimalaya(configPath, args, 120_000, childEnv);
    });
  } catch (err) {
    await rm(downloadDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }

  return downloadDir;
}

// ── Account operations ─────────────────────────────────────────────────────

export async function diagnoseAccount(setting: MailSetting): Promise<string> {
  return withTempConfig(setting, async (configPath, childEnv) => {
    const args = [
      'account', 'doctor',
      '--account', 'default',
    ];
    return runHimalaya(configPath, args, 30_000, childEnv);
  });
}

// ── Connection test ────────────────────────────────────────────────────────

export async function testConnection(setting: MailSetting): Promise<{ success: boolean; error?: string }> {
  try {
    await listFolders(setting);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatSingleAddress(a: unknown): string {
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object') {
    const name = (a as Record<string, string>).name || '';
    const email = (a as Record<string, string>).addr || (a as Record<string, string>).email || '';
    return name ? `${name} <${email}>` : email;
  }
  return '';
}

function formatAddress(addr: unknown): string {
  if (typeof addr === 'string') return addr;
  if (Array.isArray(addr)) {
    return addr.map(formatSingleAddress).filter(Boolean).join(', ');
  }
  if (addr && typeof addr === 'object') {
    return formatSingleAddress(addr);
  }
  return '';
}

function parseMessageRecord(
  value: unknown,
  folder: string,
  fallbackEnvelopeId: string,
): MailMessage | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const nested = record.message;
  const source = nested && typeof nested === 'object' ? nested as Record<string, unknown> : record;

  return {
    id: String(source.id ?? record.id ?? fallbackEnvelopeId),
    subject: String(source.subject ?? ''),
    from: formatAddress(source.from),
    to: formatAddress(source.to),
    cc: formatAddress(source.cc),
    date: String(source.date ?? ''),
    body: extractMessageBody(source),
    folder,
    hasAttachment: Boolean(source.has_attachment ?? source.hasAttachment),
  };
}

function parsePlainMessageOutput(
  raw: string,
  folder: string,
  fallbackEnvelopeId: string,
): MailMessage {
  const normalized = raw.replace(/\r\n/g, '\n');
  const headerEnd = normalized.indexOf('\n\n');
  const headers = headerEnd === -1 ? '' : normalized.slice(0, headerEnd);
  const body = headerEnd === -1 ? normalized : normalized.slice(headerEnd + 2);

  return {
    id: fallbackEnvelopeId,
    subject: extractHeader(headers, 'Subject'),
    from: extractHeader(headers, 'From'),
    to: extractHeader(headers, 'To'),
    cc: extractHeader(headers, 'Cc'),
    date: extractHeader(headers, 'Date'),
    body,
    folder,
    hasAttachment: false,
  };
}

export function parseMessageOutput(
  raw: string,
  folder: string,
  fallbackEnvelopeId: string,
): MailMessage {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const record = Array.isArray(parsed)
      ? parsed[0]
      : parsed && typeof parsed === 'object'
        ? (
            (parsed as Record<string, unknown>).message ??
            (parsed as Record<string, unknown>).item ??
            parsed
          )
        : null;

    const message = parseMessageRecord(record, folder, fallbackEnvelopeId);
    if (message) {
      return message;
    }
  } catch {
    // Fall back to plain-message parsing below.
  }

  return parsePlainMessageOutput(raw, folder, fallbackEnvelopeId);
}

function parseThreadMessageRecord(
  value: unknown,
  folder: string,
  fallbackEnvelopeId: string,
): MailMessage | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const nested = record.message;
  const source = nested && typeof nested === 'object' ? nested as Record<string, unknown> : record;

  return {
    id: String(source.id ?? record.id ?? fallbackEnvelopeId),
    subject: String(source.subject ?? ''),
    from: formatAddress(source.from),
    to: formatAddress(source.to),
    cc: formatAddress(source.cc),
    date: String(source.date ?? ''),
    body: extractMessageBody(source),
    folder,
    hasAttachment: Boolean(source.has_attachment ?? source.hasAttachment),
  };
}

function extractMessageBody(record: Record<string, unknown>): string {
  const candidates = [
    record.body,
    record.text,
    record.raw,
    record.contents,
    record.content,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      return candidate;
    }
  }

  if (record.body && typeof record.body === 'object') {
    const body = record.body as Record<string, unknown>;
    for (const key of ['plain', 'text', 'value', 'content']) {
      if (typeof body[key] === 'string') {
        return body[key] as string;
      }
    }
  }

  return '';
}

function parsePlainThreadMessages(
  raw: string,
  folder: string,
  fallbackEnvelopeId: string,
): MailMessage[] {
  const normalized = raw.replace(/\r\n/g, '\n');
  const chunks = normalized.includes('\n---')
    ? normalized.split(/\n-{3,}\n/g)
    : normalized.split(/\n(?=From:\s)/g);

  const messages = chunks
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const headerEnd = chunk.indexOf('\n\n');
      const headers = headerEnd === -1 ? '' : chunk.slice(0, headerEnd);
      const body = headerEnd === -1 ? chunk : chunk.slice(headerEnd + 2);

      return {
        id: index === 0 ? fallbackEnvelopeId : `${fallbackEnvelopeId}:${index + 1}`,
        subject: extractHeader(headers, 'Subject'),
        from: extractHeader(headers, 'From'),
        to: extractHeader(headers, 'To'),
        cc: extractHeader(headers, 'Cc'),
        date: extractHeader(headers, 'Date'),
        body,
        folder,
        hasAttachment: false,
      };
    })
    .filter((message) => {
      return Boolean(
        message.subject ||
        message.from ||
        message.to ||
        message.cc ||
        message.date ||
        message.body.trim(),
      );
    });

  if (messages.length > 0) {
    return messages;
  }

  return [{
    id: fallbackEnvelopeId,
    subject: '',
    from: '',
    to: '',
    cc: '',
    date: '',
    body: raw,
    folder,
    hasAttachment: false,
  }];
}

export function parseThreadMessages(
  raw: string,
  folder: string,
  fallbackEnvelopeId: string,
): MailMessage[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const items = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === 'object'
        ? (
            (parsed as Record<string, unknown>).messages ??
            (parsed as Record<string, unknown>).thread ??
            (parsed as Record<string, unknown>).items ??
            ((parsed as Record<string, unknown>).message ? [parsed] : null)
          )
        : null;

    if (Array.isArray(items)) {
      const messages = items
        .map((item) => parseThreadMessageRecord(item, folder, fallbackEnvelopeId))
        .filter((message): message is MailMessage => message !== null);

      if (messages.length > 0) {
        return messages;
      }
    }
  } catch {
    // Fall back to plain-text parsing below.
  }

  return parsePlainThreadMessages(raw, folder, fallbackEnvelopeId);
}

function extractHeader(headers: string, name: string): string {
  const regex = new RegExp(`^${name}:\\s*([^\\n]*(?:\\n[ \\t]+[^\\n]*)*)`, 'im');
  const match = headers.match(regex);
  if (!match) {
    return '';
  }

  return decodeMimeWords(match[1].replace(/\n[ \t]+/g, ' ').trim());
}

function decodeMimeWords(value: string): string {
  return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (_full, charset, encoding, encodedText) => {
    try {
      let buffer: Buffer;

      if (String(encoding).toUpperCase() === 'B') {
        buffer = Buffer.from(String(encodedText), 'base64');
      } else {
        const quotedPrintable = String(encodedText)
          .replace(/_/g, ' ')
          .replace(/=([0-9A-F]{2})/gi, (_m: string, hex: string) => String.fromCharCode(parseInt(hex, 16)));
        buffer = Buffer.from(quotedPrintable, 'binary');
      }

      const normalizedCharset = String(charset).toLowerCase();
      if (normalizedCharset === 'utf-8' || normalizedCharset === 'utf8') {
        return buffer.toString('utf8');
      }

      if (normalizedCharset === 'us-ascii' || normalizedCharset === 'ascii') {
        return buffer.toString('ascii');
      }
    } catch {
      return _full;
    }

    return _full;
  });
}
