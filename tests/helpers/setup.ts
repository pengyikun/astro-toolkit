import knex, { Knex } from 'knex';
import path from 'path';

let db: Knex;

export async function setupTestDb(): Promise<Knex> {
  db = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '..', '..', 'db', 'migrations'),
      extension: 'ts',
    },
  });

  await db.migrate.latest();
  return db;
}

export async function teardownTestDb(): Promise<void> {
  if (db) {
    await db.destroy();
  }
}

export async function cleanTables(database: Knex): Promise<void> {
  await database('penny_test_logs').del();
  await database('credential_items').del();
  await database('credentials').del();
  await database('account_fields').del();
  await database('accounts').del();
}

export function getTestDb(): Knex {
  return db;
}
