import { NextResponse } from 'next/server';
import { parseIBAN } from '@/lib/iban';

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(parseIBAN(body.iban));
}
