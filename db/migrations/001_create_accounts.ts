import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('accounts', (table) => {
    table.increments('id').primary();
    table.text('name').notNullable();
    table.text('region_code').notNullable();
    table.text('currency').notNullable();
    table.text('account_type').notNullable();
    table.text('status').notNullable().defaultTo('active');
    table.text('notes').defaultTo('');
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('region_code');
    table.index('status');
  });

  await knex.schema.createTable('account_fields', (table) => {
    table.increments('id').primary();
    table.integer('account_id').notNullable().references('id').inTable('accounts').onDelete('CASCADE');
    table.text('field_key').notNullable();
    table.text('field_label').notNullable();
    table.text('field_value').defaultTo('');
    table.text('field_type').notNullable().defaultTo('text');
    table.integer('is_custom').notNullable().defaultTo(0);
    table.integer('sort_order').notNullable().defaultTo(0);
    table.unique(['account_id', 'field_key']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('account_fields');
  await knex.schema.dropTableIfExists('accounts');
}
