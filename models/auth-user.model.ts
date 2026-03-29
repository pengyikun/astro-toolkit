import type { Knex } from 'knex';
import type { AuthUser } from '@/types';

function mapAuthUser(row: Record<string, unknown>): AuthUser {
  return {
    id: Number(row.id),
    email: String(row.email),
    password_hash: String(row.password_hash),
    password_salt: String(row.password_salt),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function count(db: Knex): Promise<number> {
  const result = await db('auth_users').count<{ count: number | string }>({ count: 'id' }).first();
  return Number(result?.count ?? 0);
}

export async function findById(db: Knex, id: number): Promise<AuthUser | null> {
  const row = await db('auth_users').where({ id }).first();
  return row ? mapAuthUser(row as Record<string, unknown>) : null;
}

export async function findByEmail(db: Knex, email: string): Promise<AuthUser | null> {
  const row = await db('auth_users').where({ email }).first();
  return row ? mapAuthUser(row as Record<string, unknown>) : null;
}

export async function create(
  db: Knex,
  input: Pick<AuthUser, 'email' | 'password_hash' | 'password_salt'>,
): Promise<AuthUser> {
  const [id] = await db('auth_users').insert({
    email: input.email,
    password_hash: input.password_hash,
    password_salt: input.password_salt,
  });

  const created = await findById(db, Number(id));
  if (!created) {
    throw new Error('Failed to create auth user');
  }

  return created;
}
