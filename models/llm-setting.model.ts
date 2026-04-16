import type { Knex } from 'knex';
import type { AccessScope, LlmSetting } from '@/types';
import { applyOwnerScope } from '@/lib/access';

export async function findByOwner(
  db: Knex,
  scope?: AccessScope | null,
): Promise<LlmSetting | null> {
  return applyOwnerScope(
    db('llm_settings'),
    scope,
    'llm_settings.owner_user_id',
  ).first() ?? null;
}

export async function upsert(
  db: Knex,
  data: {
    base_url: string;
    api_key?: string;
    model_name: string;
    max_tokens: number;
    owner_user_id?: number | null;
  },
  scope?: AccessScope | null,
): Promise<LlmSetting | null> {
  const now = new Date().toISOString();
  const existing = await findByOwner(db, scope);

  if (existing) {
    await applyOwnerScope(
      db('llm_settings').where('id', existing.id),
      scope,
      'llm_settings.owner_user_id',
    ).update({
      ...data,
      updated_at: now,
    });
  } else {
    await db('llm_settings').insert({
      ...data,
      owner_user_id: data.owner_user_id ?? null,
      created_at: now,
      updated_at: now,
    });
  }

  return findByOwner(db, scope);
}

export async function remove(
  db: Knex,
  id: number,
  scope?: AccessScope | null,
): Promise<number> {
  return db('llm_settings')
    .where('id', id)
    .modify((query) => {
      applyOwnerScope(query, scope, 'llm_settings.owner_user_id');
    })
    .del();
}
