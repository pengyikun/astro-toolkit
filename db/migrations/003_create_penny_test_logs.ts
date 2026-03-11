import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('penny_test_logs', (table) => {
    table.increments('id').primary();
    table.integer('account_id').references('id').inTable('accounts').onDelete('SET NULL');
    table.text('partner_name').notNullable();
    table.text('direction').notNullable();
    table.float('amount').notNullable();
    table.text('currency').notNullable();
    table.text('status').notNullable();
    table.text('reference_id').defaultTo('');
    table.text('error_code').defaultTo('');
    table.text('error_message').defaultTo('');
    table.text('request_payload').defaultTo('');
    table.text('response_payload').defaultTo('');
    table.text('notes').defaultTo('');
    table.text('tested_at').notNullable();
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('status');
    table.index('partner_name');
    table.index('tested_at');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('penny_test_logs');
}
