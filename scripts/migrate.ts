import knex from 'knex';
import knexConfig from '../knexfile';

const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env]);

db.migrate
  .latest()
  .then(([batchNo, log]) => {
    if (log.length === 0) {
      console.log('Already up to date.');
    } else {
      console.log(`Batch ${batchNo} run: ${log.length} migrations`);
      log.forEach((f: string) => console.log(`  ✓ ${f}`));
    }
  })
  .catch((err: Error) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => db.destroy());
