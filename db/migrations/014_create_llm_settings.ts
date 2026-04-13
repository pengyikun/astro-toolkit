import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('llm_settings', (table) => {
    table.increments('id').primary();
    table.integer('owner_user_id').references('id').inTable('auth_users').onDelete('SET NULL');
    table.text('base_url').notNullable();
    table.text('model_name').notNullable();
    table.integer('max_tokens').notNullable().defaultTo(4096);
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('owner_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('llm_settings');
}
