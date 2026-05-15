import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('todos', (table) => {
    table.text('category').nullable();
    table.text('waiting_on').nullable(); // 'me' | 'them' | 'external'
    table.text('due_date').nullable(); // ISO YYYY-MM-DD
    table.text('event_date').nullable(); // ISO YYYY-MM-DD
    table.text('subject').nullable();
    table.text('counterparty').nullable();
    table.index('waiting_on');
    table.index('due_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('todos', (table) => {
    table.dropIndex(['waiting_on']);
    table.dropIndex(['due_date']);
    table.dropColumn('category');
    table.dropColumn('waiting_on');
    table.dropColumn('due_date');
    table.dropColumn('event_date');
    table.dropColumn('subject');
    table.dropColumn('counterparty');
  });
}
