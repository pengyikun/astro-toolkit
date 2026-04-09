import type { Knex } from 'knex';
import type { AccessScope, MailSetting } from '@/types';
import { applyOwnerScope } from '@/lib/access';

export async function findByOwner(
  db: Knex,
  scope?: AccessScope | null,
): Promise<MailSetting | null> {
  return applyOwnerScope(
    db('mail_settings'),
    scope,
    'mail_settings.owner_user_id',
  ).first() ?? null;
}

export async function upsert(
  db: Knex,
  data: {
    imap_host: string;
    imap_port: number;
    imap_encryption: string;
    imap_login: string;
    imap_password: string;
    email: string;
    owner_user_id?: number | null;
  },
  scope?: AccessScope | null,
): Promise<MailSetting | null> {
  const now = new Date().toISOString();
  const existing = await findByOwner(db, scope);

  if (existing) {
    await applyOwnerScope(
      db('mail_settings').where('id', existing.id),
      scope,
      'mail_settings.owner_user_id',
    ).update({
      ...data,
      updated_at: now,
    });
  } else {
    await db('mail_settings').insert({
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
  return db('mail_settings')
    .where('id', id)
    .modify((query) => {
      applyOwnerScope(query, scope, 'mail_settings.owner_user_id');
    })
    .del();
}
