import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('llm_settings', (table) => {
    table.boolean('enable_thinking').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('llm_settings', (table) => {
    table.dropColumn('enable_thinking');
  });
}
