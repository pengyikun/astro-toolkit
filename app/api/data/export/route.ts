import { NextResponse } from 'next/server';
import db from '@/lib/db';
import config from '@/lib/config';
import { buildExportData } from '@/lib/export-import';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const modules: string[] = Array.isArray(body.modules) ? body.modules : [];

    const validModules = ['accounts', 'credentials', 'penny_test_logs'];
    const filtered = modules.filter((m: string) => validModules.includes(m));

    if (filtered.length === 0) {
      return NextResponse.json(
        { error: { message: 'Please select at least one module to export.', status: 400 } },
        { status: 400 },
      );
    }

    const data = await buildExportData(db, filtered, config.vaultEncryptionKey);
    const json = JSON.stringify(data, null, 2);
    const filename = `fintech-toolkit-export-${new Date().toISOString().slice(0, 10)}.json`;

    return new Response(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return NextResponse.json(
      { error: { message, status: 500 } },
      { status: 500 },
    );
  }
}
