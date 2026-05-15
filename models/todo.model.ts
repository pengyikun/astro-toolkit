import type { Knex } from 'knex';
import type { AccessScope, Todo, TodoStatus } from '@/types';
import { applyOwnerScope } from '@/lib/access';

export async function findById(
  db: Knex,
  id: number,
  scope?: AccessScope | null,
): Promise<Todo | null> {
  const row = await applyOwnerScope(
    db('todos').where('todos.id', id),
    scope,
    'todos.owner_user_id',
  ).first();
  return row ?? null;
}

export async function listByOwner(
  db: Knex,
  scope?: AccessScope | null,
  limit = 200,
): Promise<Todo[]> {
  return applyOwnerScope(
    db('todos'),
    scope,
    'todos.owner_user_id',
  ).orderByRaw(`CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'done' THEN 2 END ASC`)
    .orderBy('created_at', 'desc')
    .limit(limit);
}

export async function create(
  db: Knex,
  data: {
    title: string;
    urgency?: string;
    source?: string;
    brief_id?: number | null;
    owner_user_id?: number | null;
    category?: string | null;
    waiting_on?: 'me' | 'them' | 'external' | null;
    due_date?: string | null;
    event_date?: string | null;
    subject?: string | null;
    counterparty?: string | null;
  },
): Promise<Todo> {
  const now = new Date().toISOString();
  const [id] = await db('todos').insert({
    title: data.title,
    urgency: data.urgency ?? 'medium',
    source: data.source ?? 'manual',
    status: 'open',
    brief_id: data.brief_id ?? null,
    owner_user_id: data.owner_user_id ?? null,
    category: data.category ?? null,
    waiting_on: data.waiting_on ?? null,
    due_date: data.due_date ?? null,
    event_date: data.event_date ?? null,
    subject: data.subject ?? null,
    counterparty: data.counterparty ?? null,
    created_at: now,
    updated_at: now,
  });
  return db('todos').where('id', id).first();
}

export async function updateStatus(
  db: Knex,
  id: number,
  status: TodoStatus,
  scope?: AccessScope | null,
): Promise<void> {
  const now = new Date().toISOString();
  await applyOwnerScope(
    db('todos').where('id', id),
    scope,
    'todos.owner_user_id',
  ).update({ status, updated_at: now });
}

export async function updateTitle(
  db: Knex,
  id: number,
  title: string,
  scope?: AccessScope | null,
): Promise<void> {
  const now = new Date().toISOString();
  await applyOwnerScope(
    db('todos').where('id', id),
    scope,
    'todos.owner_user_id',
  ).update({ title, updated_at: now });
}

export async function remove(
  db: Knex,
  id: number,
  scope?: AccessScope | null,
): Promise<number> {
  return db('todos')
    .where('id', id)
    .modify((query) => {
      applyOwnerScope(query, scope, 'todos.owner_user_id');
    })
    .del();
}
