import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('identity_aliases', (table) => {
    table.increments('id').primary();
    table.integer('profile_id').notNullable().references('id').inTable('identity_profiles').onDelete('CASCADE');
    table.text('field').notNullable(); // 'email' | 'phone' | 'name' | 'company' | 'colleague'
    table.text('alias_value').notNullable();
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.index('profile_id');
    table.index('field');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('identity_aliases');
}
