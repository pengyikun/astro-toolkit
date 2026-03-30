import type { Knex } from 'knex';
import type { AccessScope, VisualizerNote } from '@/types';
import { applyOwnerScope } from '@/lib/access';

export async function findBySnippetId(
  db: Knex,
  snippetId: number,
  scope?: AccessScope | null,
): Promise<VisualizerNote[]> {
  return db('visualizer_notes')
    .modify((query) => {
      applyOwnerScope(query, scope, 'visualizer_notes.owner_user_id');
    })
    .where('snippet_id', snippetId)
    .orderBy('created_at', 'asc');
}

export async function create(
  db: Knex,
  data: {
    snippet_id: number;
    node_id: number;
    row_index: number;
    node_path: string;
    node_title: string;
    field_key: string;
    content: string;
    owner_user_id?: number | null;
  },
): Promise<VisualizerNote> {
  const now = new Date().toISOString();
  const [id] = await db('visualizer_notes').insert({
    owner_user_id: data.owner_user_id ?? null,
    snippet_id: data.snippet_id,
    node_id: data.node_id,
    row_index: data.row_index,
    node_path: data.node_path,
    node_title: data.node_title,
    field_key: data.field_key,
    content: data.content,
    created_at: now,
  });
  return db('visualizer_notes').where('id', id).first();
}

async function findScopedNote(
  db: Knex,
  id: number,
  snippetId: number,
  scope?: AccessScope | null,
) {
  return db('visualizer_notes')
    .where({
      id,
      snippet_id: snippetId,
    })
    .modify((query) => {
      applyOwnerScope(query, scope, 'visualizer_notes.owner_user_id');
    })
    .first();
}

export async function update(
  db: Knex,
  id: number,
  snippetId: number,
  data: { content: string },
  scope?: AccessScope | null,
): Promise<VisualizerNote | null> {
  const existing = await findScopedNote(db, id, snippetId, scope);
  if (!existing) return null;

  await db('visualizer_notes')
    .where({
      id,
      snippet_id: snippetId,
    })
    .modify((query) => {
      applyOwnerScope(query, scope, 'visualizer_notes.owner_user_id');
    })
    .update({ content: data.content });

  return findScopedNote(db, id, snippetId, scope);
}

export async function remove(
  db: Knex,
  id: number,
  snippetId: number,
  scope?: AccessScope | null,
): Promise<number> {
  return db('visualizer_notes')
    .where({
      id,
      snippet_id: snippetId,
    })
    .modify((query) => {
      applyOwnerScope(query, scope, 'visualizer_notes.owner_user_id');
    })
    .del();
}
