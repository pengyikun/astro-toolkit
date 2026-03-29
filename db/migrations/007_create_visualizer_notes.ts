import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('visualizer_notes', (table) => {
    table.increments('id').primary();
    table.integer('snippet_id').notNullable().references('id').inTable('saved_snippets').onDelete('CASCADE');
    table.integer('node_id').notNullable();
    table.integer('row_index').notNullable().defaultTo(-1);
    table.text('node_path').notNullable();
    table.text('node_title').notNullable();
    table.text('field_key').defaultTo('');
    table.text('content').notNullable();
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.index('snippet_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('visualizer_notes');
}
