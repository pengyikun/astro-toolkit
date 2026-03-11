import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('credentials', (table) => {
    table.increments('id').primary();
    table.text('partner_name').notNullable();
    table.text('environment').notNullable().defaultTo('sandbox');
    table.text('label').notNullable();
    table.text('notes').defaultTo('');
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('partner_name');
  });

  await knex.schema.createTable('credential_items', (table) => {
    table.increments('id').primary();
    table.integer('credential_id').notNullable().references('id').inTable('credentials').onDelete('CASCADE');
    table.text('item_key').notNullable();
    table.text('item_value').notNullable();
    table.text('item_type').notNullable().defaultTo('text');
    table.text('file_name');
    table.text('file_path');
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.unique(['credential_id', 'item_key']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('credential_items');
  await knex.schema.dropTableIfExists('credentials');
}
