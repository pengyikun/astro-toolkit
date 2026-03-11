import knex from 'knex';
import knexConfig from '../knexfile';

const env = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[env]);

db.seed
  .run()
  .then(() => console.log('Seeds run successfully.'))
  .catch((err: Error) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  })
  .finally(() => db.destroy());
