import path from 'path';
import knex, { type Knex } from 'knex';

function createDb(): Knex {
  const dbPath = process.env.DB_PATH || './db/toolkit.db';

  return knex({
    client: 'better-sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(process.cwd(), 'db', 'migrations'),
      extension: 'ts',
    },
  });
}

// Module-level singleton — only created once per process
const db = createDb();

export default db;
