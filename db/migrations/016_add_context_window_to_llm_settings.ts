import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('llm_settings', (table) => {
    table.integer('context_window').notNullable().defaultTo(128000);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('llm_settings', (table) => {
    table.dropColumn('context_window');
  });
}
