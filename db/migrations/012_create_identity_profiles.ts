import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('identity_profiles', (table) => {
    table.increments('id').primary();
    table.integer('owner_user_id').references('id').inTable('auth_users').onDelete('SET NULL');
    table.text('display_name').notNullable();
    table.text('email').notNullable().defaultTo('');
    table.text('phone').notNullable().defaultTo('');
    table.text('company').notNullable().defaultTo('');
    table.text('college').notNullable().defaultTo('');
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('owner_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('identity_profiles');
}
