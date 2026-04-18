import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if the old 'college' column exists (fresh DBs have it from migration 012)
  const cols = await knex.raw("PRAGMA table_info('identity_profiles')");
  const hasCollege = cols.some((c: { name: string }) => c.name === 'college');

  if (hasCollege) {
    await knex.raw('ALTER TABLE identity_profiles RENAME COLUMN college TO colleague');
  }
}

export async function down(knex: Knex): Promise<void> {
  const cols = await knex.raw("PRAGMA table_info('identity_profiles')");
  const hasColleague = cols.some((c: { name: string }) => c.name === 'colleague');

  if (hasColleague) {
    await knex.raw('ALTER TABLE identity_profiles RENAME COLUMN colleague TO college');
  }
}
