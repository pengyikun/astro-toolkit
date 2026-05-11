import type { Knex } from 'knex';
import type { AccessScope, WhatsAppSetting } from '@/types';
import { applyStrictOwnerScope } from '@/lib/access';

export async function findByOwner(
  db: Knex,
  scope?: AccessScope | null,
): Promise<WhatsAppSetting | null> {
  const row = await applyStrictOwnerScope(
    db('whatsapp_settings'),
    scope,
    'whatsapp_settings.owner_user_id',
  ).first();
  return row ?? null;
}

export async function upsert(
  db: Knex,
  data: {
    db_path: string;
    owner_user_id?: number | null;
  },
  scope?: AccessScope | null,
): Promise<WhatsAppSetting | null> {
  const now = new Date().toISOString();
  const existing = await findByOwner(db, scope);

  if (existing) {
    await applyStrictOwnerScope(
      db('whatsapp_settings').where('id', existing.id),
      scope,
      'whatsapp_settings.owner_user_id',
    ).update({
      ...data,
      updated_at: now,
    });
  } else {
    await db('whatsapp_settings').insert({
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
  return db('whatsapp_settings')
    .where('id', id)
    .modify((query) => {
      applyStrictOwnerScope(query, scope, 'whatsapp_settings.owner_user_id');
    })
    .del();
}
