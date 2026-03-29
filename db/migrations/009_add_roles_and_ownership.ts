import type { Knex } from 'knex';

const OWNER_TABLES = [
  'accounts',
  'credentials',
  'penny_test_logs',
  'saved_snippets',
  'visualizer_notes',
] as const;

async function addOwnerColumn(knex: Knex, tableName: (typeof OWNER_TABLES)[number]) {
  const hasColumn = await knex.schema.hasColumn(tableName, 'owner_user_id');
  if (hasColumn) {
    return;
  }

  await knex.schema.alterTable(tableName, (table) => {
    table.integer('owner_user_id').references('id').inTable('auth_users').onDelete('SET NULL');
    table.index('owner_user_id');
  });
}

async function getFirstUserId(knex: Knex): Promise<number | null> {
  const firstUser = await knex('auth_users')
    .select('id')
    .orderBy('created_at', 'asc')
    .orderBy('id', 'asc')
    .first();

  return firstUser ? Number(firstUser.id) : null;
}

export async function up(knex: Knex): Promise<void> {
  const hasRole = await knex.schema.hasColumn('auth_users', 'role');
  if (!hasRole) {
    await knex.schema.alterTable('auth_users', (table) => {
      table.text('role').defaultTo('operator');
      table.index('role');
    });
  }

  await knex('auth_users').whereNull('role').update({ role: 'operator' });
  await knex('auth_users').whereNotIn('role', ['admin', 'operator']).update({ role: 'operator' });

  const firstUserId = await getFirstUserId(knex);
  if (firstUserId) {
    await knex('auth_users')
      .where({ id: firstUserId })
      .update({ role: 'admin', updated_at: knex.fn.now() });
  }

  for (const tableName of OWNER_TABLES) {
    await addOwnerColumn(knex, tableName);
  }

  if (firstUserId) {
    for (const tableName of ['accounts', 'credentials', 'penny_test_logs', 'saved_snippets'] as const) {
      await knex(tableName)
        .whereNull('owner_user_id')
        .update({ owner_user_id: firstUserId });
    }

    const notes = await knex('visualizer_notes')
      .leftJoin('saved_snippets', 'saved_snippets.id', 'visualizer_notes.snippet_id')
      .select(
        'visualizer_notes.id as id',
        'saved_snippets.owner_user_id as snippet_owner_user_id',
      );

    for (const note of notes) {
      await knex('visualizer_notes')
        .where({ id: note.id as number })
        .update({
          owner_user_id: note.snippet_owner_user_id ?? firstUserId,
        });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const tableName of OWNER_TABLES) {
    const hasColumn = await knex.schema.hasColumn(tableName, 'owner_user_id');
    if (hasColumn) {
      await knex.schema.alterTable(tableName, (table) => {
        table.dropColumn('owner_user_id');
      });
    }
  }

  const hasRole = await knex.schema.hasColumn('auth_users', 'role');
  if (hasRole) {
    await knex.schema.alterTable('auth_users', (table) => {
      table.dropColumn('role');
    });
  }
}
