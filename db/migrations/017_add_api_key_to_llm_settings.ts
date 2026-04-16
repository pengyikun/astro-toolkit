import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('llm_settings', (table) => {
    table.text('api_key').notNullable().defaultTo('');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('llm_settings', (table) => {
    table.dropColumn('api_key');
  });
}
