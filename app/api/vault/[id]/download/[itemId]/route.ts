import path from 'path';
import { readFile } from 'fs/promises';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import config from '@/lib/config';
import { resolveStoredUploadPath } from '@/lib/uploads';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const { id, itemId } = await params;
    const credentialId = Number(id);
    const numericItemId = Number(itemId);

    if (Number.isNaN(credentialId) || Number.isNaN(numericItemId)) {
      return NextResponse.json(
        { error: { message: 'Invalid credential item ID', status: 400 } },
        { status: 400 },
      );
    }

    const item = await db('credential_items')
      .where({
        id: numericItemId,
        credential_id: credentialId,
        item_type: 'file',
      })
      .first();

    if (!item) {
      return NextResponse.json(
        { error: { message: 'File item not found', status: 404 } },
        { status: 404 },
      );
    }

    const filePath = await resolveStoredUploadPath(item.file_path as string | null, config.uploadDir);
    if (!filePath) {
      return NextResponse.json(
        { error: { message: 'Uploaded file is missing', status: 404 } },
        { status: 404 },
      );
    }

    const buffer = await readFile(filePath);
    const downloadName = path.basename((item.file_name as string | null) || path.basename(filePath));

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { error: { message: 'File download failed', status: 500 } },
      { status: 500 },
    );
  }
}
