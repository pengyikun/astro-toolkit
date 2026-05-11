import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Knex } from 'knex';
import { setupTestDb, teardownTestDb } from '../helpers/setup';
import * as VisualizerNoteModel from '../../models/visualizer-note.model';
import type { AccessScope } from '../../types';

let db: Knex;

const operatorScope: AccessScope = { userId: 1, role: 'operator' };
const adminScope: AccessScope = { userId: 0, role: 'admin' };
const otherScope: AccessScope = { userId: 2, role: 'operator' };

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(() => teardownTestDb());

beforeEach(async () => {
  await db('visualizer_notes').del();
  await db('saved_snippets').del();
  await db('auth_users').del();
  const now = new Date().toISOString();
  await db('auth_users').insert([
    { id: 1, email: 'op@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
    { id: 2, email: 'other@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
  ]);
  await db('saved_snippets').insert({
    id: 1,
    owner_user_id: 1,
    title: 'snip',
    snippet_type: 'json',
    content: '{}',
    parse_result: '',
    notes: '',
    created_at: now,
    updated_at: now,
  });
});

function makeNoteData(over: Record<string, unknown> = {}) {
  return {
    snippet_id: 1,
    node_id: 11,
    row_index: 0,
    node_path: '$.foo',
    node_title: 'foo',
    field_key: 'k',
    content: 'note text',
    owner_user_id: 1,
    ...over,
  } as Parameters<typeof VisualizerNoteModel.create>[1];
}

describe('VisualizerNoteModel.create', () => {
  it('creates a note with returned fields', async () => {
    const n = await VisualizerNoteModel.create(db, makeNoteData());
    expect(n.id).toBeGreaterThan(0);
    expect(n.snippet_id).toBe(1);
    expect(n.content).toBe('note text');
  });

  it('defaults owner_user_id to null when not given', async () => {
    const n = await VisualizerNoteModel.create(db, makeNoteData({ owner_user_id: undefined }));
    expect(n.owner_user_id).toBeNull();
  });
});

describe('VisualizerNoteModel.findBySnippetId', () => {
  it('returns notes ordered by created_at asc', async () => {
    await VisualizerNoteModel.create(db, makeNoteData({ content: 'first', node_id: 1 }));
    await new Promise((r) => setTimeout(r, 5));
    await VisualizerNoteModel.create(db, makeNoteData({ content: 'second', node_id: 2 }));
    const list = await VisualizerNoteModel.findBySnippetId(db, 1, adminScope);
    expect(list.map((n) => n.content)).toEqual(['first', 'second']);
  });

  it('respects ownership scope', async () => {
    await VisualizerNoteModel.create(db, makeNoteData({ owner_user_id: 1 }));
    expect((await VisualizerNoteModel.findBySnippetId(db, 1, operatorScope)).length).toBe(1);
    expect((await VisualizerNoteModel.findBySnippetId(db, 1, otherScope)).length).toBe(0);
  });
});

describe('VisualizerNoteModel.update', () => {
  it('updates the content of an owned note', async () => {
    const n = await VisualizerNoteModel.create(db, makeNoteData());
    const updated = await VisualizerNoteModel.update(db, n.id, 1, { content: 'updated' }, operatorScope);
    expect(updated?.content).toBe('updated');
  });

  it('returns null when the note is not owned', async () => {
    const n = await VisualizerNoteModel.create(db, makeNoteData({ owner_user_id: 1 }));
    const result = await VisualizerNoteModel.update(db, n.id, 1, { content: 'hack' }, otherScope);
    expect(result).toBeNull();
  });
});

describe('VisualizerNoteModel.remove', () => {
  it('removes an owned note', async () => {
    const n = await VisualizerNoteModel.create(db, makeNoteData());
    const deleted = await VisualizerNoteModel.remove(db, n.id, 1, operatorScope);
    expect(deleted).toBe(1);
  });

  it('does not remove a note belonging to another owner', async () => {
    const n = await VisualizerNoteModel.create(db, makeNoteData({ owner_user_id: 1 }));
    const deleted = await VisualizerNoteModel.remove(db, n.id, 1, otherScope);
    expect(deleted).toBe(0);
  });
});
