import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as CredentialModel from '@/models/credential.model';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { itemId } = await params;
  const result = await CredentialModel.revealItem(db, Number(itemId));
  if (!result) {
    return NextResponse.json({ error: { message: 'Item not found', status: 404 } }, { status: 404 });
  }
  return NextResponse.json({ value: result.decrypted_value });
}
