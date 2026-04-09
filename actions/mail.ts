'use server';

import { revalidatePath } from 'next/cache';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import type { AccessScope, MailSetting, MailEnvelope, MailMessage, MailFolder } from '@/types';
import { mailSettingSchema } from '@/schemas/mail.schema';
import * as MailSettingModel from '@/models/mail-setting.model';
import db from '@/lib/db';
import config from '@/lib/config';
import { encrypt } from '@/lib/encryption';
import { createSignedAttachmentDownloadToken } from '@/lib/auth';
import { ownerUserIdFromScope, requireAccessScope } from '@/lib/access';
import {
  testConnection,
  listEnvelopes,
  listEnvelopeThreads,
  listFolders,
  readMessage,
  readMessageThread,
  exportMessage,
  downloadAttachments,
  diagnoseAccount,
  cleanupStaleAttachments,
  ensureAttachmentCleanupScheduled,
  decryptMailSetting,
  validateMailEnvelopeId,
  validateMailFolder,
} from '@/lib/mail';

const MAX_FOLDERS = 10;

// ── Settings actions ───────────────────────────────────────────────────────

export interface MailActionResult {
  success: boolean;
  errors?: Array<{ field: string; message: string }>;
}

export async function saveMailSettings(formData: FormData): Promise<MailActionResult> {
  const scope = await requireAccessScope();

  const rawPassword = String(formData.get('imap_password') ?? '');

  const raw = {
    imap_host: formData.get('imap_host'),
    imap_port: formData.get('imap_port'),
    imap_encryption: formData.get('imap_encryption'),
    imap_login: formData.get('imap_login'),
    imap_password: rawPassword || 'placeholder', // allow empty on update; validated below
    email: formData.get('email'),
  };

  const parsed = mailSettingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  // On update with empty password, preserve the existing encrypted password
  let encryptedPassword: string;
  if (rawPassword) {
    encryptedPassword = JSON.stringify(encrypt(rawPassword, config.vaultEncryptionKey));
  } else {
    const existing = await MailSettingModel.findByOwner(db, scope);
    if (!existing) {
      return { success: false, errors: [{ field: 'imap_password', message: 'Password is required' }] };
    }
    encryptedPassword = existing.imap_password;
  }

  await MailSettingModel.upsert(db, {
    ...parsed.data,
    imap_password: encryptedPassword,
    owner_user_id: ownerUserIdFromScope(scope),
  }, scope);

  revalidatePath('/data');
  revalidatePath('/mail');

  return { success: true };
}

export async function deleteMailSettings(formData: FormData): Promise<void> {
  const scope = await requireAccessScope();
  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;

  await MailSettingModel.remove(db, id, scope);
  revalidatePath('/data');
  revalidatePath('/mail');
}

/**
 * Returns mail settings safe for UI rendering — NEVER includes the password.
 */
export async function getMailSettings(): Promise<Omit<MailSetting, 'imap_password'> | null> {
  const scope = await requireAccessScope();
  const setting = await MailSettingModel.findByOwner(db, scope);
  if (!setting) return null;

  // Strip password before returning to client
  const { imap_password: _, ...safe } = setting;
  return safe;
}

/**
 * Internal: returns settings with decrypted password for server-side mail operations.
 * NEVER export this function or return its result to the client.
 */
async function getMailSettingsInternal(): Promise<MailSetting | null> {
  const { setting } = await getMailOperationContext();
  return setting;
}

async function getMailOperationContext(): Promise<{ scope: AccessScope; setting: MailSetting | null }> {
  const scope = await requireAccessScope();
  const setting = await MailSettingModel.findByOwner(db, scope);
  if (!setting) {
    return { scope, setting: null };
  }

  return {
    scope,
    setting: await decryptMailSetting(setting, config.vaultEncryptionKey),
  };
}

// ── Connection actions ─────────────────────────────────────────────────────

export async function testMailConnection(): Promise<{ success: boolean; error?: string }> {
  let setting: MailSetting | null;
  try {
    setting = await getMailSettingsInternal();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Mail settings are invalid.' };
  }
  if (!setting) {
    return { success: false, error: 'No mail settings configured. Go to Settings to configure IMAP.' };
  }
  return testConnection(setting);
}

export async function diagnoseMailAccount(): Promise<{ success: boolean; output?: string; error?: string }> {
  let setting: MailSetting | null;
  try {
    setting = await getMailSettingsInternal();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Mail settings are invalid.' };
  }
  if (!setting) {
    return { success: false, error: 'No mail settings configured.' };
  }
  try {
    const output = await diagnoseAccount(setting);
    return { success: true, output };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Diagnosis failed' };
  }
}

// ── Folder actions ─────────────────────────────────────────────────────────

export async function fetchMailFolders(): Promise<{ success: boolean; folders?: MailFolder[]; error?: string }> {
  let setting: MailSetting | null;
  try {
    setting = await getMailSettingsInternal();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Mail settings are invalid.' };
  }
  if (!setting) {
    return { success: false, error: 'No mail settings configured.' };
  }
  try {
    const folders = await listFolders(setting);
    return { success: true, folders };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to list folders' };
  }
}

// ── Envelope actions ───────────────────────────────────────────────────────

function validateFolders(folders: unknown): string[] {
  if (!Array.isArray(folders)) return [];
  return folders
    .flatMap((folder) => {
      try {
        return [validateMailFolder(folder)];
      } catch {
        return [];
      }
    })
    .slice(0, MAX_FOLDERS);
}

export async function fetchEnvelopes(
  folders: string[],
  dateFrom: string,
  dateTo: string,
  opts: { page?: number; pageSize?: number; query?: string } = {},
): Promise<{ success: boolean; envelopes?: MailEnvelope[]; page?: number; pageSize?: number; error?: string }> {
  let setting: MailSetting | null;
  try {
    setting = await getMailSettingsInternal();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Mail settings are invalid.' };
  }
  if (!setting) {
    return { success: false, error: 'No mail settings configured.' };
  }

  const safeFolders = validateFolders(folders);
  if (safeFolders.length === 0) {
    return { success: false, error: 'At least one folder is required.' };
  }

  try {
    const results: MailEnvelope[] = [];
    let lastPage = 1;
    let lastPageSize = 50;

    for (const folder of safeFolders) {
      const result = await listEnvelopes(setting, folder, {
        dateFrom,
        dateTo,
        page: opts.page,
        pageSize: opts.pageSize,
        query: opts.query,
      });
      results.push(...result.envelopes);
      lastPage = result.page;
      lastPageSize = result.pageSize;
    }

    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return { success: true, envelopes: results, page: lastPage, pageSize: lastPageSize };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch emails' };
  }
}

export async function fetchEnvelopeThreads(
  folder: string,
  opts: { dateFrom?: string; dateTo?: string; page?: number; pageSize?: number; query?: string } = {},
): Promise<{ success: boolean; envelopes?: MailEnvelope[]; error?: string }> {
  let setting: MailSetting | null;
  try {
    setting = await getMailSettingsInternal();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Mail settings are invalid.' };
  }
  if (!setting) {
    return { success: false, error: 'No mail settings configured.' };
  }

  const safeFolders = validateFolders([folder]);
  if (safeFolders.length === 0) {
    return { success: false, error: 'A valid folder name is required.' };
  }

  try {
    const result = await listEnvelopeThreads(setting, safeFolders[0], opts);
    return { success: true, envelopes: result.envelopes };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch threads' };
  }
}

// ── Message actions ────────────────────────────────────────────────────────

export async function fetchMessage(
  folder: string,
  envelopeId: string,
): Promise<{ success: boolean; message?: MailMessage; error?: string }> {
  let setting: MailSetting | null;
  try {
    setting = await getMailSettingsInternal();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Mail settings are invalid.' };
  }
  if (!setting) {
    return { success: false, error: 'No mail settings configured.' };
  }

  try {
    const safeFolder = validateMailFolder(folder);
    const safeId = validateMailEnvelopeId(envelopeId);
    const message = await readMessage(setting, safeFolder, safeId);
    return { success: true, message };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to read message' };
  }
}

export async function fetchMessageThread(
  folder: string,
  envelopeId: string,
): Promise<{ success: boolean; messages?: MailMessage[]; error?: string }> {
  let setting: MailSetting | null;
  try {
    setting = await getMailSettingsInternal();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Mail settings are invalid.' };
  }
  if (!setting) {
    return { success: false, error: 'No mail settings configured.' };
  }

  try {
    const safeFolder = validateMailFolder(folder);
    const safeId = validateMailEnvelopeId(envelopeId);
    const messages = await readMessageThread(setting, safeFolder, safeId);
    return { success: true, messages };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to read thread' };
  }
}

export async function fetchMessageRaw(
  folder: string,
  envelopeId: string,
): Promise<{ success: boolean; raw?: string; error?: string }> {
  let setting: MailSetting | null;
  try {
    setting = await getMailSettingsInternal();
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Mail settings are invalid.' };
  }
  if (!setting) {
    return { success: false, error: 'No mail settings configured.' };
  }

  try {
    const safeFolder = validateMailFolder(folder);
    const safeId = validateMailEnvelopeId(envelopeId);
    const raw = await exportMessage(setting, safeFolder, safeId);
    return { success: true, raw };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to export message' };
  }
}

// ── Attachment actions ─────────────────────────────────────────────────────

export async function fetchAttachments(
  folder: string,
  envelopeId: string,
): Promise<{ success: boolean; files?: Array<{ name: string; size: number; token: string }>; downloadId?: string; error?: string }> {
  let setting: MailSetting | null;
  let scope: AccessScope;
  try {
    const context = await getMailOperationContext();
    scope = context.scope;
    setting = context.setting;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Mail settings are invalid.' };
  }
  if (!setting) {
    return { success: false, error: 'No mail settings configured.' };
  }

  ensureAttachmentCleanupScheduled();

  // Opportunistic cleanup of stale attachments before downloading new ones
  await cleanupStaleAttachments().catch(() => {});

  try {
    const safeFolder = validateMailFolder(folder);
    const safeId = validateMailEnvelopeId(envelopeId);
    const downloadDir = await downloadAttachments(setting, safeFolder, safeId);
    const downloadId = path.basename(downloadDir);

    const MAX_ATTACHMENT_FILES = 50;
    const MAX_ATTACHMENT_TOTAL_BYTES = 50 * 1024 * 1024;

    const entries = await readdir(downloadDir);
    const files: Array<{ name: string; size: number; token: string }> = [];
    let totalSize = 0;
    for (const entry of entries) {
      if (entry.startsWith('.')) {
        continue;
      }
      const info = await stat(path.join(downloadDir, entry));
      if (info.isFile()) {
        totalSize += info.size;
        if (files.length >= MAX_ATTACHMENT_FILES || totalSize > MAX_ATTACHMENT_TOTAL_BYTES) {
          break;
        }
        files.push({
          name: entry,
          size: info.size,
          token: await createSignedAttachmentDownloadToken({
            downloadId,
            filename: entry,
            ownerUserId: ownerUserIdFromScope(scope),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000),
          }, process.env),
        });
      }
    }

    return { success: true, files, downloadId };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to download attachments' };
  }
}
