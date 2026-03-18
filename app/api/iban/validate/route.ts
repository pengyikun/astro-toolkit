import { NextResponse } from 'next/server';
import { parseIBAN } from '@/lib/iban';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(parseIBAN(body.iban));
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid request body', status: 400 } },
      { status: 400 },
    );
  }
}
