'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { credentialSchema } from '@/schemas/credential.schema';
import * as CredentialModel from '@/models/credential.model';
import db from '@/lib/db';
import config from '@/lib/config';
import {
  assertWithinFileSizeLimit,
  buildStoredCertPath,
  removeStoredUpload,
} from '@/lib/uploads';
import type { CredentialItem } from '@/types';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_CERT_EXTENSIONS = ['.pem', '.crt', '.cer', '.p12', '.pfx', '.key', '.jks'];

export interface VaultActionResult {
  success: boolean;
  errors?: Array<{ field: string; message: string }>;
}

function parseItemsFromFormData(
  formData: FormData
): Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'>[] {
  const items: Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'>[] = [];

  const itemKeys = formData.getAll('item_key');
  const itemValues = formData.getAll('item_value');

  for (let i = 0; i < itemKeys.length; i++) {
    const key = String(itemKeys[i] || '').trim();
    if (key) {
      items.push({
        item_key: key,
        item_value: String(itemValues[i] || ''),
        item_type: 'text',
        file_name: null,
        file_path: null,
      });
    }
  }

  return items;
}

async function handleCertUpload(
  formData: FormData,
  certKey: string
): Promise<Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'> | null> {
  const file = formData.get('cert_file') as File | null;
  if (!file || file.size === 0) return null;

  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_CERT_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid certificate file extension: ${ext}. Allowed: ${ALLOWED_CERT_EXTENSIONS.join(', ')}`);
  }
  assertWithinFileSizeLimit(file, config.maxFileSizeMB, 'Certificate file');

  const uploadDir = config.certUploadDir;
  await mkdir(uploadDir, { recursive: true });

  const uuid = crypto.randomUUID();
  const fileName = `${uuid}${ext}`;
  const filePath = path.join(uploadDir, fileName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return {
    item_key: certKey || 'certificate',
    item_value: '',
    item_type: 'file',
    file_name: file.name,
    file_path: buildStoredCertPath(fileName),
  };
}

export async function createCredential(formData: FormData): Promise<VaultActionResult> {
  const raw = {
    partner_name: formData.get('partner_name'),
    environment: formData.get('environment'),
    label: formData.get('label'),
    notes: formData.get('notes') || '',
  };

  const parsed = credentialSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const items = parseItemsFromFormData(formData);

  const certKey = String(formData.get('cert_key') || 'certificate').trim();
  let certItem: Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'> | null = null;
  try {
    certItem = await handleCertUpload(formData, certKey);
  } catch (error) {
    return { success: false, errors: [{ field: 'cert_file', message: error instanceof Error ? error.message : 'Certificate upload failed' }] };
  }
  if (certItem) {
    items.push(certItem);
  }

  let credential;
  try {
    credential = await CredentialModel.create(db, { ...parsed.data, items });
  } catch (error) {
    await removeStoredUpload(certItem?.file_path, config.uploadDir);
    throw error;
  }

  revalidatePath('/vault');
  revalidatePath('/');
  redirect(`/vault/${credential.id}`);
}

export async function updateCredential(id: number, formData: FormData): Promise<VaultActionResult> {
  const raw = {
    partner_name: formData.get('partner_name'),
    environment: formData.get('environment'),
    label: formData.get('label'),
    notes: formData.get('notes') || '',
  };

  const parsed = credentialSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    };
  }

  const items = parseItemsFromFormData(formData);

  const existingCredential = await CredentialModel.findById(db, id);
  if (!existingCredential) {
    return { success: false, errors: [{ field: '', message: 'Credential set not found' }] };
  }

  const certKey = String(formData.get('cert_key') || 'certificate').trim();
  let certItem: Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'> | null = null;
  try {
    certItem = await handleCertUpload(formData, certKey);
  } catch (error) {
    return { success: false, errors: [{ field: 'cert_file', message: error instanceof Error ? error.message : 'Certificate upload failed' }] };
  }
  if (certItem) {
    items.push(certItem);
  }

  let credential;
  try {
    credential = await CredentialModel.update(db, id, { ...parsed.data, items });
  } catch (error) {
    await removeStoredUpload(certItem?.file_path, config.uploadDir);
    throw error;
  }
  if (!credential) {
    await removeStoredUpload(certItem?.file_path, config.uploadDir);
    return { success: false, errors: [{ field: '', message: 'Credential set not found' }] };
  }

  const previousFileItems = existingCredential.items.filter((item) => item.item_type === 'file');
  const currentFileItems = credential.items.filter((item) => item.item_type === 'file');
  const removedFileItems = previousFileItems.filter(
    (item) =>
      !currentFileItems.some(
        (currentItem) =>
          currentItem.item_key === item.item_key &&
          currentItem.file_path === item.file_path,
      ),
  );

  for (const item of removedFileItems) {
    await removeStoredUpload(item.file_path, config.uploadDir);
  }

  revalidatePath('/vault');
  revalidatePath(`/vault/${id}`);
  revalidatePath('/');
  redirect(`/vault/${id}`);
}

export async function deleteCredential(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!id || isNaN(id)) return;

  const credential = await CredentialModel.findById(db, id);
  await CredentialModel.remove(db, id);

  if (credential?.items?.length) {
    for (const item of credential.items) {
      if (item.item_type === 'file') {
        await removeStoredUpload(item.file_path, config.uploadDir);
      }
    }
  }

  revalidatePath('/vault');
  revalidatePath('/');
  redirect('/vault');
}
