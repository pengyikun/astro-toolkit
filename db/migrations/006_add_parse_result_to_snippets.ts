import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('saved_snippets', (table) => {
    table.text('parse_result').defaultTo('');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('saved_snippets', (table) => {
    table.dropColumn('parse_result');
  });
}
