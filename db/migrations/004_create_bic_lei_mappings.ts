import type { Knex } from 'knex';
import fs from 'fs';
import path from 'path';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('bic_lei_mappings', (table) => {
    table.text('bic').notNullable().primary();
    table.text('lei').notNullable();
    table.index('lei');
  });

  // Seed from CSV if available — skip for in-memory test DBs
  const connConfig = knex.client.config.connection as any;
  if (connConfig?.filename === ':memory:') return;

  const candidates = [
    path.join(process.cwd(), 'lei-bic-20260227T000000.csv'),
  ];
  if (typeof __dirname !== 'undefined') {
    candidates.push(path.join(__dirname, '..', '..', 'lei-bic-20260227T000000.csv'));
  }
  const csvPath = candidates.find(p => fs.existsSync(p));
  if (!csvPath) return;

  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').slice(1); // skip header

  const BATCH_SIZE = 500;
  let batch: Array<{ bic: string; lei: string }> = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const commaIdx = trimmed.indexOf(',');
    if (commaIdx === -1) continue;

    const lei = trimmed.substring(0, commaIdx).trim();
    const bic = trimmed.substring(commaIdx + 1).trim();
    if (!lei || !bic) continue;

    batch.push({ bic, lei });

    if (batch.length >= BATCH_SIZE) {
      await knex('bic_lei_mappings').insert(batch).onConflict('bic').ignore();
      batch = [];
    }
  }

  if (batch.length > 0) {
    await knex('bic_lei_mappings').insert(batch).onConflict('bic').ignore();
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bic_lei_mappings');
}
