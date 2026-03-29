import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('auth_users', (table) => {
    table.increments('id').primary();
    table.text('email').notNullable().unique();
    table.text('password_hash').notNullable();
    table.text('password_salt').notNullable();
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('email');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('auth_users');
}
