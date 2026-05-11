import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { Knex } from 'knex';
import { setupTestDb, teardownTestDb } from '../helpers/setup';
import * as SnippetModel from '../../models/snippet.model';
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
  await db('saved_snippets').del();
  await db('auth_users').del();
  const now = new Date().toISOString();
  await db('auth_users').insert([
    { id: 1, email: 'op@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
    { id: 2, email: 'other@test.com', password_hash: 'h', password_salt: 's', role: 'operator', created_at: now, updated_at: now },
  ]);
});

async function makeSnippet(over: Record<string, unknown> = {}) {
  return SnippetModel.create(db, {
    title: 'Demo',
    snippet_type: 'json',
    content: '{}',
    parse_result: 'parsed',
    notes: '',
    owner_user_id: 1,
    ...over,
  } as Parameters<typeof SnippetModel.create>[1]);
}

describe('SnippetModel.create', () => {
  it('creates a snippet with timestamps and id', async () => {
    const s = await makeSnippet();
    expect(s.id).toBeGreaterThan(0);
    expect(s.title).toBe('Demo');
    expect(s.created_at).toBeDefined();
    expect(s.updated_at).toBeDefined();
  });

  it('defaults notes to empty string', async () => {
    const s = await makeSnippet({ notes: undefined });
    expect(s.notes).toBe('');
  });

  it('allows null owner_user_id when not provided', async () => {
    const s = await makeSnippet({ owner_user_id: undefined });
    expect(s.owner_user_id).toBeNull();
  });
});

describe('SnippetModel.findAll', () => {
  beforeEach(async () => {
    await makeSnippet({ title: 'A', snippet_type: 'json', notes: 'apple' });
    await makeSnippet({ title: 'B', snippet_type: 'xml', notes: 'banana' });
    await makeSnippet({ title: 'C', snippet_type: 'json', notes: 'cherry', owner_user_id: 2 });
  });

  it('returns paginated results with metadata', async () => {
    const res = await SnippetModel.findAll(db, { perPage: 2 }, adminScope);
    expect(res.data.length).toBe(2);
    expect(res.total).toBe(3);
    expect(res.page).toBe(1);
    expect(res.perPage).toBe(2);
    expect(res.totalPages).toBe(2);
  });

  it('filters by snippet_type', async () => {
    const res = await SnippetModel.findAll(db, { snippet_type: 'xml' }, adminScope);
    expect(res.data.length).toBe(1);
    expect(res.data[0].title).toBe('B');
  });

  it('filters by free-text search across title and notes', async () => {
    const byTitle = await SnippetModel.findAll(db, { search: 'A' }, adminScope);
    expect(byTitle.data.some((s) => s.title === 'A')).toBe(true);
    const byNotes = await SnippetModel.findAll(db, { search: 'cherry' }, adminScope);
    expect(byNotes.data.some((s) => s.title === 'C')).toBe(true);
  });

  it('scopes to owner for non-admin scope', async () => {
    const res = await SnippetModel.findAll(db, {}, operatorScope);
    expect(res.data.every((s) => s.owner_user_id === 1)).toBe(true);
  });

  it('does not leak other-owner snippets', async () => {
    const res = await SnippetModel.findAll(db, {}, otherScope);
    expect(res.data.length).toBe(1);
    expect(res.data[0].title).toBe('C');
  });

  it('clamps perPage to a minimum of 1', async () => {
    const res = await SnippetModel.findAll(db, { perPage: 0 }, adminScope);
    expect(res.perPage).toBe(25);
  });

  it('clamps perPage to a maximum of 100', async () => {
    const res = await SnippetModel.findAll(db, { perPage: 999 }, adminScope);
    expect(res.perPage).toBe(100);
  });
});

describe('SnippetModel.findById', () => {
  it('returns the snippet for the owner', async () => {
    const created = await makeSnippet();
    const found = await SnippetModel.findById(db, created.id, operatorScope);
    expect(found?.id).toBe(created.id);
  });

  it('returns null when scoped to a different owner', async () => {
    const created = await makeSnippet({ owner_user_id: 1 });
    const found = await SnippetModel.findById(db, created.id, otherScope);
    expect(found).toBeNull();
  });

  it('admin scope can read any snippet', async () => {
    const created = await makeSnippet({ owner_user_id: 1 });
    const found = await SnippetModel.findById(db, created.id, adminScope);
    expect(found?.id).toBe(created.id);
  });
});

describe('SnippetModel.remove', () => {
  it('removes a snippet for the owner', async () => {
    const s = await makeSnippet();
    const deleted = await SnippetModel.remove(db, s.id, operatorScope);
    expect(deleted).toBe(1);
    expect(await SnippetModel.findById(db, s.id, adminScope)).toBeNull();
  });

  it('does not remove a snippet belonging to another owner', async () => {
    const s = await makeSnippet({ owner_user_id: 1 });
    const deleted = await SnippetModel.remove(db, s.id, otherScope);
    expect(deleted).toBe(0);
    expect(await SnippetModel.findById(db, s.id, adminScope)).not.toBeNull();
  });
});

describe('SnippetModel.count', () => {
  beforeEach(async () => {
    await makeSnippet({ snippet_type: 'json' });
    await makeSnippet({ snippet_type: 'json' });
    await makeSnippet({ snippet_type: 'xml' });
  });

  it('counts all snippets in admin scope', async () => {
    expect(await SnippetModel.count(db, undefined, adminScope)).toBe(3);
  });

  it('counts only the requested type', async () => {
    expect(await SnippetModel.count(db, 'json', adminScope)).toBe(2);
    expect(await SnippetModel.count(db, 'xml', adminScope)).toBe(1);
  });

  it('respects scope ownership', async () => {
    expect(await SnippetModel.count(db, undefined, otherScope)).toBe(0);
  });
});
