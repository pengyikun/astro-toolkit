import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('todos', (table) => {
    table.increments('id').primary();
    table.integer('owner_user_id').references('id').inTable('auth_users').onDelete('SET NULL');
    table.text('title').notNullable();
    table.text('urgency').notNullable().defaultTo('medium'); // 'high' | 'medium' | 'low'
    table.text('source').notNullable().defaultTo('manual'); // 'brief' | 'manual'
    table.text('status').notNullable().defaultTo('open'); // 'open' | 'in_progress' | 'done'
    table.integer('brief_id').references('id').inTable('briefs').onDelete('SET NULL');
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('owner_user_id');
    table.index('status');
    table.index('brief_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('todos');
}
