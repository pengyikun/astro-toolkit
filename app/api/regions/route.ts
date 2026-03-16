import { NextResponse } from 'next/server';
import { getAllRegions } from '@/lib/region-schemas';

export async function GET() {
  return NextResponse.json(getAllRegions());
}
