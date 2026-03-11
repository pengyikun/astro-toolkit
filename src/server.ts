import knex from 'knex';
import config from './config';
import knexConfig from '../knexfile';
import createApp from './app';

const env = config.nodeEnv === 'test' ? 'test' : 'development';
const db = knex(knexConfig[env]);

db.migrate
  .latest()
  .then(() => {
    const app = createApp(db);
    app.listen(config.port, () => {
      console.log(`FinTech PM Toolkit running on http://localhost:${config.port} [${config.nodeEnv}]`);
    });
  })
  .catch((err: Error) => {
    console.error('Failed to run migrations:', err);
    process.exit(1);
  });
