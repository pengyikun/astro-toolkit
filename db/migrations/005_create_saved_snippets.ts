import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('saved_snippets', (table) => {
    table.increments('id').primary();
    table.text('title').notNullable();
    table.text('snippet_type').notNullable();
    table.text('content').notNullable();
    table.text('notes').defaultTo('');
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('snippet_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('saved_snippets');
}
