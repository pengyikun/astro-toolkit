import { NextResponse } from 'next/server';
import db from '@/lib/db';
import config from '@/lib/config';
import { processImportData } from '@/lib/export-import';
import { assertWithinFileSizeLimit } from '@/lib/uploads';
import type { ExportData } from '@/types';
import { getAccessScope, isAdminScope, ownerUserIdFromScope } from '@/lib/access';

export async function POST(request: Request) {
  try {
    const scope = await getAccessScope();
    if (!isAdminScope(scope)) {
      return NextResponse.json(
        { error: { message: 'Import is restricted to admins.', status: 403 } },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: { message: 'Please select a file to import.', status: 400 } },
        { status: 400 },
      );
    }

    try {
      assertWithinFileSizeLimit(file, config.maxFileSizeMB, 'Import file');
    } catch (error) {
      return NextResponse.json(
        { error: { message: error instanceof Error ? error.message : 'Import file is too large', status: 413 } },
        { status: 413 },
      );
    }

    let jsonData: ExportData;
    try {
      const text = await file.text();
      jsonData = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: { message: 'Invalid JSON file.', status: 400 } },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: { message: 'No importable modules found in the file.', status: 400 } },
        { status: 400 },
      );
    }

    const summary = await processImportData(
      db,
      jsonData,
      selectedModules,
      config.vaultEncryptionKey,
      ownerUserIdFromScope(scope),
    );
    return NextResponse.json({ success: true, summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Import failed';
    const status = message.includes('Invalid import') ? 400 : 500;
    return NextResponse.json(
      { error: { message, status } },
      { status },
    );
  }
}
