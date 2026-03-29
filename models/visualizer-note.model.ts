import type { Knex } from 'knex';
import type { VisualizerNote } from '@/types';

export async function findBySnippetId(
  db: Knex,
  snippetId: number
): Promise<VisualizerNote[]> {
  return db('visualizer_notes')
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
  }
): Promise<VisualizerNote> {
  const now = new Date().toISOString();
  const [id] = await db('visualizer_notes').insert({
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

export async function update(
  db: Knex,
  id: number,
  data: { content: string }
): Promise<VisualizerNote | null> {
  const existing = await db('visualizer_notes').where('id', id).first();
  if (!existing) return null;
  await db('visualizer_notes').where('id', id).update({ content: data.content });
  return db('visualizer_notes').where('id', id).first();
}

export async function remove(db: Knex, id: number): Promise<number> {
  return db('visualizer_notes').where('id', id).del();
}
