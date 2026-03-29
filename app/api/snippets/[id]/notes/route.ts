import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as NoteModel from '@/models/visualizer-note.model';
import * as SnippetModel from '@/models/snippet.model';
import { getAccessScope, ownerUserIdFromScope } from '@/lib/access';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const scope = await getAccessScope();
  if (!scope) {
    return NextResponse.json({ error: { message: 'Authentication required.' } }, { status: 401 });
  }

  const { id } = await params;
  const snippetId = Number(id);
  if (!snippetId || isNaN(snippetId)) {
    return NextResponse.json({ error: { message: 'Invalid snippet ID' } }, { status: 400 });
  }
  const snippet = await SnippetModel.findById(db, snippetId, scope);
  if (!snippet) {
    return NextResponse.json({ error: { message: 'Snippet not found' } }, { status: 404 });
  }

  const notes = await NoteModel.findBySnippetId(db, snippetId, scope);
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

  const { id } = await params;
  const snippetId = Number(id);
  if (!snippetId || isNaN(snippetId)) {
    return NextResponse.json({ error: { message: 'Invalid snippet ID' } }, { status: 400 });
  }
  const snippet = await SnippetModel.findById(db, snippetId, scope);
  if (!snippet) {
    return NextResponse.json({ error: { message: 'Snippet not found' } }, { status: 404 });
  }

  try {
    const body = await request.json();
    const note = await NoteModel.create(db, {
      owner_user_id: ownerUserIdFromScope(scope),
      snippet_id: snippetId,
      node_id: Number(body.node_id),
      row_index: Number(body.row_index ?? -1),
      node_path: String(body.node_path || ''),
      node_title: String(body.node_title || ''),
      field_key: String(body.field_key || ''),
      content: String(body.content || ''),
    });
    return NextResponse.json(note, { status: 201 });
  } catch {
    return NextResponse.json({ error: { message: 'Failed to create note' } }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  _context: { params: Promise<{ id: string }> }
) {
  try {
    const scope = await getAccessScope();
    if (!scope) {
      return NextResponse.json({ error: { message: 'Authentication required.' } }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const noteId = Number(searchParams.get('noteId'));
    if (!noteId || isNaN(noteId)) {
      return NextResponse.json({ error: { message: 'Invalid note ID' } }, { status: 400 });
    }
    await NoteModel.remove(db, noteId, scope);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: { message: 'Failed to delete note' } }, { status: 500 });
  }
}
