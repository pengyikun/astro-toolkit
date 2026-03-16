import { NextResponse } from 'next/server';
import { parseBIC } from '@/lib/bic';

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(parseBIC(body.bic));
}
