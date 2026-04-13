import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('briefs', (table) => {
    table.increments('id').primary();
    table.integer('owner_user_id').references('id').inTable('auth_users').onDelete('SET NULL');
    table.text('connectors').notNullable(); // JSON array: ["email", "whatsapp"]
    table.text('date_from').notNullable();
    table.text('date_to').notNullable();
    table.text('status').notNullable().defaultTo('pending'); // 'pending' | 'running' | 'completed' | 'failed'
    table.text('thinking').notNullable().defaultTo('');
    table.text('summary').notNullable().defaultTo('');
    table.text('pending_items').notNullable().defaultTo('');
    table.text('error').notNullable().defaultTo('');
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('owner_user_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('briefs');
}
