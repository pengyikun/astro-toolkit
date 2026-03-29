import fs from 'fs';
import path from 'path';
import knex from 'knex';
import knexConfig from '../knexfile';

async function main() {
  const env = process.env.NODE_ENV || 'development';
  const db = knex(knexConfig[env]);
  const seedsDir = path.join(__dirname, '..', 'db', 'seeds');

  if (!fs.existsSync(seedsDir)) {
    console.log('No seed files found. Skipping.');
    await db.destroy();
    return;
  }

  try {
    await db.seed.run();
    console.log('Seeds run successfully.');
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

void main();
