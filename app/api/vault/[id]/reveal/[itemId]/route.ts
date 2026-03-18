import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as CredentialModel from '@/models/credential.model';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const { itemId } = await params;
    const numericId = Number(itemId);
    if (isNaN(numericId)) {
      return NextResponse.json({ error: { message: 'Invalid item ID', status: 400 } }, { status: 400 });
    }
    const result = await CredentialModel.revealItem(db, numericId);
    if (!result) {
      return NextResponse.json({ error: { message: 'Item not found', status: 404 } }, { status: 404 });
    }
    return NextResponse.json({ value: result.decrypted_value });
  } catch {
    return NextResponse.json(
      { error: { message: 'Failed to reveal credential', status: 500 } },
      { status: 500 },
    );
  }
}
