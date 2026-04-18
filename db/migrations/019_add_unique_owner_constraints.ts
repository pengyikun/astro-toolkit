import type { Knex } from 'knex';

const TABLES = ['mail_settings', 'whatsapp_settings', 'llm_settings', 'identity_profiles'];

export async function up(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    // Remove duplicate rows (keep lowest ID per owner_user_id)
    await knex.raw(`
      DELETE FROM ${table} WHERE id NOT IN (
        SELECT MIN(id) FROM ${table} GROUP BY COALESCE(owner_user_id, -1)
      )
    `);

    await knex.schema.alterTable(table, (t) => {
      t.unique(['owner_user_id']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const table of TABLES) {
    await knex.schema.alterTable(table, (t) => {
      t.dropUnique(['owner_user_id']);
    });
  }
}
