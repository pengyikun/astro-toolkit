import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as NoteModel from '@/models/visualizer-note.model';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const snippetId = Number(id);
  if (!snippetId || isNaN(snippetId)) {
    return NextResponse.json({ error: { message: 'Invalid snippet ID' } }, { status: 400 });
  }
  const notes = await NoteModel.findBySnippetId(db, snippetId);
  return NextResponse.json(notes);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const snippetId = Number(id);
  if (!snippetId || isNaN(snippetId)) {
    return NextResponse.json({ error: { message: 'Invalid snippet ID' } }, { status: 400 });
  }
  try {
    const body = await request.json();
    const note = await NoteModel.create(db, {
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
    const { searchParams } = new URL(request.url);
    const noteId = Number(searchParams.get('noteId'));
    if (!noteId || isNaN(noteId)) {
      return NextResponse.json({ error: { message: 'Invalid note ID' } }, { status: 400 });
    }
    await NoteModel.remove(db, noteId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: { message: 'Failed to delete note' } }, { status: 500 });
  }
}
