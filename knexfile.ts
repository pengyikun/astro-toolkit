import path from 'path';
import type { Knex } from 'knex';
import NodeSQLiteClient from './lib/knex-node-sqlite';

const config: Record<string, Knex.Config> = {
  development: {
    client: NodeSQLiteClient as unknown as string,
    connection: { filename: process.env.DB_PATH || './db/toolkit.db' },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, 'db', 'migrations'), extension: 'ts' },
    seeds: { directory: path.join(__dirname, 'db', 'seeds') },
  },
  test: {
    client: NodeSQLiteClient as unknown as string,
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: { directory: path.join(__dirname, 'db', 'migrations'), extension: 'ts' },
    seeds: { directory: path.join(__dirname, 'db', 'seeds') },
  },
};

export default config;
