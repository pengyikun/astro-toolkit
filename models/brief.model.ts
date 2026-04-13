import type { Knex } from 'knex';
import type { AccessScope, Brief, BriefStatus } from '@/types';
import { applyOwnerScope } from '@/lib/access';

export async function findById(
  db: Knex,
  id: number,
  scope?: AccessScope | null,
): Promise<Brief | null> {
  const row = await applyOwnerScope(
    db('briefs').where('briefs.id', id),
    scope,
    'briefs.owner_user_id',
  ).first();
  return row ?? null;
}

export async function listByOwner(
  db: Knex,
  scope?: AccessScope | null,
  limit = 50,
): Promise<Brief[]> {
  return applyOwnerScope(
    db('briefs'),
    scope,
    'briefs.owner_user_id',
  ).orderBy('created_at', 'desc').limit(limit);
}

export async function findLatestCompleted(
  db: Knex,
  scope?: AccessScope | null,
): Promise<Brief | null> {
  const row = await applyOwnerScope(
    db('briefs').where('status', 'completed'),
    scope,
    'briefs.owner_user_id',
  ).orderBy('created_at', 'desc').first();
  return row ?? null;
}

export async function create(
  db: Knex,
  data: {
    connectors: string;
    date_from: string;
    date_to: string;
    owner_user_id?: number | null;
  },
): Promise<Brief> {
  const now = new Date().toISOString();
  const [id] = await db('briefs').insert({
    ...data,
    status: 'pending',
    thinking: '',
    summary: '',
    pending_items: '',
    error: '',
    owner_user_id: data.owner_user_id ?? null,
    created_at: now,
    updated_at: now,
  });
  return db('briefs').where('id', id).first();
}

export async function updateStatus(
  db: Knex,
  id: number,
  updates: {
    status: BriefStatus;
    thinking?: string;
    summary?: string;
    pending_items?: string;
    error?: string;
  },
  scope?: AccessScope | null,
): Promise<void> {
  const now = new Date().toISOString();
  const query = db('briefs').where('id', id);
  if (scope) {
    applyOwnerScope(query, scope, 'briefs.owner_user_id');
  }
  await query.update({
    ...updates,
    updated_at: now,
  });
}

export async function remove(
  db: Knex,
  id: number,
  scope?: AccessScope | null,
): Promise<number> {
  return db('briefs')
    .where('id', id)
    .modify((query) => {
      applyOwnerScope(query, scope, 'briefs.owner_user_id');
    })
    .del();
}
