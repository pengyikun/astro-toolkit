import { NextResponse } from 'next/server';
import { parseBIC } from '@/lib/bic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json(parseBIC(body.bic));
  } catch {
    return NextResponse.json(
      { error: { message: 'Invalid request body', status: 400 } },
      { status: 400 },
    );
  }
}
