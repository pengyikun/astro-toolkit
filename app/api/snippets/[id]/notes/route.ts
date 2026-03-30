import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as NoteModel from '@/models/visualizer-note.model';
import * as SnippetModel from '@/models/snippet.model';
import { getAccessScope, ownerUserIdFromScope } from '@/lib/access';

async function requireSnippet(
  params: Promise<{ id: string }>,
  scope: Awaited<ReturnType<typeof getAccessScope>>,
) {
  const { id } = await params;
  const snippetId = Number(id);
  if (!snippetId || Number.isNaN(snippetId)) {
    return {
      error: NextResponse.json({ error: { message: 'Invalid snippet ID' } }, { status: 400 }),
    };
  }

  const snippet = await SnippetModel.findById(db, snippetId, scope);
  if (!snippet) {
    return {
      error: NextResponse.json({ error: { message: 'Snippet not found' } }, { status: 404 }),
    };
  }

  return { snippetId, snippet };
}

function normalizeNoteContent(value: unknown): string | null {
  const content = String(value ?? '').trim();
  return content ? content : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getAccessScope();
  if (!scope) {
    return NextResponse.json({ error: { message: 'Authentication required.' } }, { status: 401 });
  }

  const result = await requireSnippet(params, scope);
  if (result.error) {
    return result.error;
  }

  const notes = await NoteModel.findBySnippetId(db, result.snippetId, scope);
  return NextResponse.json(notes);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getAccessScope();
  if (!scope) {
    return NextResponse.json({ error: { message: 'Authentication required.' } }, { status: 401 });
  }

  const result = await requireSnippet(params, scope);
  if (result.error) {
    return result.error;
  }

  try {
    const body = await request.json();
    const content = normalizeNoteContent(body.content);
    if (!content) {
      return NextResponse.json({ error: { message: 'Note content is required' } }, { status: 400 });
    }

    const note = await NoteModel.create(db, {
      owner_user_id: ownerUserIdFromScope(scope),
      snippet_id: result.snippetId,
      node_id: Number(body.node_id),
      row_index: Number(body.row_index ?? -1),
      node_path: String(body.node_path || ''),
      node_title: String(body.node_title || ''),
      field_key: String(body.field_key || ''),
      content,
    });
    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json({ error: { message: 'Failed to create note' } }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await getAccessScope();
    if (!scope) {
      return NextResponse.json({ error: { message: 'Authentication required.' } }, { status: 401 });
    }

    const result = await requireSnippet(params, scope);
    if (result.error) {
      return result.error;
    }

    const body = await request.json();
    const noteId = Number(body.noteId);
    if (!noteId || Number.isNaN(noteId)) {
      return NextResponse.json({ error: { message: 'Invalid note ID' } }, { status: 400 });
    }
    const content = normalizeNoteContent(body.content);
    if (!content) {
      return NextResponse.json({ error: { message: 'Note content is required' } }, { status: 400 });
    }

    const updated = await NoteModel.update(
      db,
      noteId,
      result.snippetId,
      { content },
      scope,
    );
    if (!updated) {
      return NextResponse.json({ error: { message: 'Note not found' } }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: { message: 'Failed to update note' } }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await getAccessScope();
    if (!scope) {
      return NextResponse.json({ error: { message: 'Authentication required.' } }, { status: 401 });
    }

    const result = await requireSnippet(params, scope);
    if (result.error) {
      return result.error;
    }

    const { searchParams } = new URL(request.url);
    const noteId = Number(searchParams.get('noteId'));
    if (!noteId || Number.isNaN(noteId)) {
      return NextResponse.json({ error: { message: 'Invalid note ID' } }, { status: 400 });
    }

    const removed = await NoteModel.remove(db, noteId, result.snippetId, scope);
    if (removed === 0) {
      return NextResponse.json({ error: { message: 'Note not found' } }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: { message: 'Failed to delete note' } }, { status: 500 });
  }
}
