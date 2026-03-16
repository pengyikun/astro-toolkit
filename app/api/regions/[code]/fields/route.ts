import { NextResponse } from 'next/server';
import { getRegionFields } from '@/lib/region-schemas';

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const fields = getRegionFields(code.toUpperCase());
  if (!fields) {
    return NextResponse.json({ error: { message: 'Region not found', status: 404 } }, { status: 404 });
  }
  return NextResponse.json(fields);
}
