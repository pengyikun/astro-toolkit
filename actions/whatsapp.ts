'use server';

import { revalidatePath } from 'next/cache';
import type { WhatsAppChat, WhatsAppMessage, WhatsAppSetting } from '@/types';
import { whatsappSettingSchema } from '@/schemas/whatsapp.schema';
import * as WhatsAppSettingModel from '@/models/whatsapp-setting.model';
import db from '@/lib/db';
import { ownerUserIdFromScope, requireAccessScope } from '@/lib/access';
import {
  testWhatsAppConnection,
  listChats,
  listMessages,
  getChatInfo,
  validateChatJid,
} from '@/lib/whatsapp';

// ── Settings actions ───────────────────────────────────────────────────────

export interface WhatsAppActionResult {
  success: boolean;
  errors?: Array<{ field: string; message: string }>;
}

export async function saveWhatsAppSettings(formData: FormData): Promise<WhatsAppActionResult> {
  const scope = await requireAccessScope();

  const raw = {
    db_path: formData.get('db_path'),
  };

  const parsed = whatsappSettingSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  await WhatsAppSettingModel.upsert(db, {
    ...parsed.data,
    owner_user_id: ownerUserIdFromScope(scope),
  }, scope);

  revalidatePath('/data');
  revalidatePath('/whatsapp');

  return { success: true };
}

export async function deleteWhatsAppSettings(formData: FormData): Promise<void> {
  const scope = await requireAccessScope();
  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;

  await WhatsAppSettingModel.remove(db, id, scope);
  revalidatePath('/data');
  revalidatePath('/whatsapp');
}

/**
 * Returns WhatsApp settings safe for UI rendering.
 */
export async function getWhatsAppSettings(): Promise<Omit<WhatsAppSetting, 'db_path'> & { db_path: string } | null> {
  const scope = await requireAccessScope();
  const setting = await WhatsAppSettingModel.findByOwner(db, scope);
  return setting ?? null;
}

// ── Internal helper ────────────────────────────────────────────────────────

async function getWhatsAppDbPath(): Promise<string | null> {
  const scope = await requireAccessScope();
  const setting = await WhatsAppSettingModel.findByOwner(db, scope);
  return setting?.db_path || null;
}

// ── Connection actions ─────────────────────────────────────────────────────

export async function testWhatsAppDb(): Promise<{ success: boolean; error?: string }> {
  const dbPath = await getWhatsAppDbPath();
  if (!dbPath) {
    return { success: false, error: 'No WhatsApp settings configured. Go to Settings to configure the database path.' };
  }
  return testWhatsAppConnection(dbPath);
}

// ── Chat actions ───────────────────────────────────────────────────────────

export async function fetchChats(
  dateFrom: string,
  dateTo: string,
  opts: { page?: number; pageSize?: number; query?: string } = {},
): Promise<{ success: boolean; chats?: WhatsAppChat[]; page?: number; pageSize?: number; error?: string }> {
  const dbPath = await getWhatsAppDbPath();
  if (!dbPath) {
    return { success: false, error: 'No WhatsApp settings configured. Go to Settings to configure the database path.' };
  }

  try {
    const result = listChats(dbPath, {
      dateFrom,
      dateTo,
      page: opts.page,
      pageSize: opts.pageSize,
      query: opts.query,
    });
    return { success: true, chats: result.chats, page: result.page, pageSize: result.pageSize };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch chats' };
  }
}

// ── Message actions ────────────────────────────────────────────────────────

export async function fetchChatMessages(
  chatJid: string,
  dateFrom: string,
  dateTo: string,
  opts: { page?: number; pageSize?: number; query?: string } = {},
): Promise<{ success: boolean; messages?: WhatsAppMessage[]; chatName?: string; page?: number; pageSize?: number; error?: string }> {
  const dbPath = await getWhatsAppDbPath();
  if (!dbPath) {
    return { success: false, error: 'No WhatsApp settings configured. Go to Settings to configure the database path.' };
  }

  try {
    const safeJid = validateChatJid(chatJid);
    const chat = getChatInfo(dbPath, safeJid);
    const result = listMessages(dbPath, safeJid, {
      dateFrom,
      dateTo,
      page: opts.page,
      pageSize: opts.pageSize,
      query: opts.query,
    });
    return {
      success: true,
      messages: result.messages,
      chatName: chat?.name || safeJid,
      page: result.page,
      pageSize: result.pageSize,
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to fetch messages' };
  }
}

// ── Native file picker action ──────────────────────────────────────────────

export async function pickDatabaseFile(): Promise<{ success: boolean; path?: string; error?: string }> {
  await requireAccessScope();

  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  try {
    const { stdout } = await execFileAsync('osascript', [
      '-e',
      'set chosenFile to choose file of type {"public.database", "public.data"} with prompt "Select WhatsApp messages.db"',
      '-e',
      'POSIX path of chosenFile',
    ], { timeout: 120_000 });

    const filePath = stdout.trim();
    if (!filePath) {
      return { success: false, error: 'No file selected.' };
    }

    return { success: true, path: filePath };
  } catch {
    // User cancelled the dialog or osascript failed
    return { success: false };
  }
}
