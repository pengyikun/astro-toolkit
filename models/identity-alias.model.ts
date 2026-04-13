import type { Knex } from 'knex';
import type { IdentityAlias, IdentityAliasField } from '@/types';

export async function findByProfileId(
  db: Knex,
  profileId: number,
): Promise<IdentityAlias[]> {
  return db('identity_aliases').where('profile_id', profileId).orderBy('field').orderBy('id');
}

export async function create(
  db: Knex,
  data: { profile_id: number; field: IdentityAliasField; alias_value: string },
): Promise<IdentityAlias> {
  const now = new Date().toISOString();
  const [id] = await db('identity_aliases').insert({
    ...data,
    created_at: now,
  });
  return db('identity_aliases').where('id', id).first();
}

export async function remove(
  db: Knex,
  id: number,
  profileId: number,
): Promise<number> {
  return db('identity_aliases').where('id', id).where('profile_id', profileId).del();
}
