import type { Knex } from 'knex';
import type { AccessScope, IdentityProfile } from '@/types';
import { applyOwnerScope } from '@/lib/access';

export async function findByOwner(
  db: Knex,
  scope?: AccessScope | null,
): Promise<IdentityProfile | null> {
  return applyOwnerScope(
    db('identity_profiles'),
    scope,
    'identity_profiles.owner_user_id',
  ).first() ?? null;
}

export async function ensureProfile(
  db: Knex,
  ownerUserId: number | null,
  scope?: AccessScope | null,
): Promise<IdentityProfile> {
  const existing = await findByOwner(db, scope);
  if (existing) return existing;

  const now = new Date().toISOString();
  const [id] = await db('identity_profiles').insert({
    display_name: '',
    email: '',
    phone: '',
    company: '',
    colleague: '',
    owner_user_id: ownerUserId,
    created_at: now,
    updated_at: now,
  });
  return db('identity_profiles').where('id', id).first();
}

export async function remove(
  db: Knex,
  id: number,
  scope?: AccessScope | null,
): Promise<number> {
  return db('identity_profiles')
    .where('id', id)
    .modify((query) => {
      applyOwnerScope(query, scope, 'identity_profiles.owner_user_id');
    })
    .del();
}
