import path from 'path';
import dotenv from 'dotenv';
import type { Knex } from 'knex';

dotenv.config();

const config: Record<string, Knex.Config> = {
  development: {
    client: 'better-sqlite3',
    connection: { filename: process.env.DB_PATH || './db/toolkit.db' },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, 'db', 'migrations'), extension: 'ts' },
    seeds: { directory: path.join(__dirname, 'db', 'seeds') },
  },
  test: {
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, 'db', 'migrations'), extension: 'ts' },
    seeds: { directory: path.join(__dirname, 'db', 'seeds') },
  },
};

export default config;
