process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Knex } from 'knex';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import * as SnippetModel from '../../models/snippet.model';
import * as NoteModel from '../../models/visualizer-note.model';
import type { AccessScope, AuthUser } from '../../types';

let db: Knex;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

async function createUser(email: string, role: AuthUser['role']): Promise<AuthUser> {
  const now = new Date().toISOString();
  const [id] = await db('auth_users').insert({
    email,
    role,
    password_hash: 'hash',
    password_salt: 'salt',
    created_at: now,
    updated_at: now,
  });

  return {
    id: Number(id),
    email,
    role,
    password_hash: 'hash',
    password_salt: 'salt',
    created_at: now,
    updated_at: now,
  };
}

function scopeFor(user: AuthUser): AccessScope {
  return {
    userId: user.id,
    role: user.role,
  };
}

describe('Visualizer note scoping', () => {
  it('updates notes only when both snippet and owner match', async () => {
    const owner = await createUser('owner@example.com', 'operator');
    const other = await createUser('other@example.com', 'operator');

    const snippetA = await SnippetModel.create(db, {
      title: 'Snippet A',
      snippet_type: 'json',
      content: '{"a":1}',
      parse_result: '{"a":1}',
      owner_user_id: owner.id,
    });
    const snippetB = await SnippetModel.create(db, {
      title: 'Snippet B',
      snippet_type: 'json',
      content: '{"b":1}',
      parse_result: '{"b":1}',
      owner_user_id: owner.id,
    });

    const note = await NoteModel.create(db, {
      snippet_id: snippetA.id,
      node_id: 1,
      row_index: -1,
      node_path: '$',
      node_title: 'Root',
      field_key: '',
      content: 'Original note',
      owner_user_id: owner.id,
    });

    const ownerScope = scopeFor(owner);
    const otherScope = scopeFor(other);

    await expect(
      NoteModel.update(db, note.id, snippetB.id, { content: 'Wrong snippet' }, ownerScope),
    ).resolves.toBeNull();
    await expect(
      NoteModel.update(db, note.id, snippetA.id, { content: 'Wrong owner' }, otherScope),
    ).resolves.toBeNull();

    const updated = await NoteModel.update(
      db,
      note.id,
      snippetA.id,
      { content: 'Updated note' },
      ownerScope,
    );

    expect(updated?.content).toBe('Updated note');

    const persisted = await NoteModel.findBySnippetId(db, snippetA.id, ownerScope);
    expect(persisted[0]?.content).toBe('Updated note');
  });

  it('deletes notes only when both snippet and owner match', async () => {
    const owner = await createUser('owner@example.com', 'operator');
    const other = await createUser('other@example.com', 'operator');

    const snippetA = await SnippetModel.create(db, {
      title: 'Snippet A',
      snippet_type: 'json',
      content: '{"a":1}',
      parse_result: '{"a":1}',
      owner_user_id: owner.id,
    });
    const snippetB = await SnippetModel.create(db, {
      title: 'Snippet B',
      snippet_type: 'json',
      content: '{"b":1}',
      parse_result: '{"b":1}',
      owner_user_id: owner.id,
    });

    const note = await NoteModel.create(db, {
      snippet_id: snippetA.id,
      node_id: 1,
      row_index: -1,
      node_path: '$',
      node_title: 'Root',
      field_key: '',
      content: 'Delete me',
      owner_user_id: owner.id,
    });

    const ownerScope = scopeFor(owner);
    const otherScope = scopeFor(other);

    await expect(NoteModel.remove(db, note.id, snippetB.id, ownerScope)).resolves.toBe(0);
    await expect(NoteModel.remove(db, note.id, snippetA.id, otherScope)).resolves.toBe(0);
    await expect(NoteModel.remove(db, note.id, snippetA.id, ownerScope)).resolves.toBe(1);

    const remaining = await NoteModel.findBySnippetId(db, snippetA.id, ownerScope);
    expect(remaining).toHaveLength(0);
  });
});
