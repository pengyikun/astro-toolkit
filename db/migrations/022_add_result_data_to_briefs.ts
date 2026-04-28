import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('briefs', (table) => {
    // JSON-encoded structured BriefResult ({ summary, pendingItems }).
    // Stored alongside legacy `summary` / `pending_items` markdown so the
    // UI can render a table view and old briefs continue to work.
    table.text('result_data').notNullable().defaultTo('');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('briefs', (table) => {
    table.dropColumn('result_data');
  });
}
