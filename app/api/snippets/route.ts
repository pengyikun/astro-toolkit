import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { snippetSchema } from '@/schemas/snippet.schema';
import * as SnippetModel from '@/models/snippet.model';
import { getAccessScope, ownerUserIdFromScope } from '@/lib/access';

export async function POST(request: Request) {
  try {
    const scope = await getAccessScope();
    if (!scope) {
      return NextResponse.json(
        { error: { message: 'Authentication required.', status: 401 } },
        { status: 401 },
      );
    }

    const body = await request.json();
    const parsed = snippetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: 'Validation failed', issues: parsed.error.issues } },
        { status: 400 },
      );
    }

    const snippet = await SnippetModel.create(db, {
      ...parsed.data,
      owner_user_id: ownerUserIdFromScope(scope),
    });
    return NextResponse.json(snippet, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: { message: 'Failed to save snippet', status: 500 } },
      { status: 500 },
    );
  }
}
