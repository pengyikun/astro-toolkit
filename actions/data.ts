'use server';

import db from '@/lib/db';
import config from '@/lib/config';
import { buildExportData, processImportData } from '@/lib/export-import';
import { assertWithinFileSizeLimit } from '@/lib/uploads';
import type { ExportData, ImportSummary } from '@/types';

export interface ExportResult {
  success: boolean;
  data?: ExportData;
  error?: string;
}

export interface ImportResult {
  success: boolean;
  summary?: ImportSummary;
  error?: string;
}

export async function exportData(modules: string[]): Promise<ExportResult> {
  if (!modules.length) {
    return { success: false, error: 'Please select at least one module to export.' };
  }

  const validModules = ['accounts', 'credentials', 'penny_test_logs'];
  const filtered = modules.filter((m) => validModules.includes(m));

  if (!filtered.length) {
    return { success: false, error: 'No valid modules selected.' };
  }

  try {
    const data = await buildExportData(db, filtered, config.vaultEncryptionKey);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Export failed',
    };
  }
}

export async function importData(formData: FormData): Promise<ImportResult> {
  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, error: 'Please select a file to import.' };
  }

  try {
    assertWithinFileSizeLimit(file, config.maxFileSizeMB, 'Import file');
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Import file is too large',
    };
  }

  let jsonData: ExportData;
  try {
    const text = await file.text();
    jsonData = JSON.parse(text);
  } catch {
    return { success: false, error: 'Invalid JSON file.' };
  }

  const selectedModules: string[] = [];
  if (formData.get('import_accounts')) selectedModules.push('accounts');
  if (formData.get('import_credentials')) selectedModules.push('credentials');
  if (formData.get('import_penny_test_logs')) selectedModules.push('penny_test_logs');

  if (selectedModules.length === 0) {
    if (jsonData.accounts) selectedModules.push('accounts');
    if (jsonData.credentials) selectedModules.push('credentials');
    if (jsonData.penny_test_logs) selectedModules.push('penny_test_logs');
  }

  if (selectedModules.length === 0) {
    return { success: false, error: 'No importable modules found in the file.' };
  }

  try {
    const summary = await processImportData(db, jsonData, selectedModules, config.vaultEncryptionKey);
    return { success: true, summary };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Import failed',
    };
  }
}
