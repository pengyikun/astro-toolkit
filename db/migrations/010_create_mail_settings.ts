import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('mail_settings', (table) => {
    table.increments('id').primary();
    table.integer('owner_user_id').references('id').inTable('auth_users').onDelete('SET NULL');
    table.text('imap_host').notNullable();
    table.integer('imap_port').notNullable().defaultTo(993);
    table.text('imap_encryption').notNullable().defaultTo('tls');
    table.text('imap_login').notNullable();
    table.text('imap_password').notNullable();
    table.text('email').notNullable();
    table.text('created_at').notNullable().defaultTo(knex.fn.now());
    table.text('updated_at').notNullable().defaultTo(knex.fn.now());
    table.index('owner_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('mail_settings');
}
