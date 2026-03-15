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
    const server = app.listen(config.port, () => {
      console.log(`FinTech PM Toolkit running on http://localhost:${config.port} [${config.nodeEnv}]`);
    });

    const shutdown = (signal: string) => {
      console.log(`\n${signal} received — shutting down gracefully…`);
      server.close(() => {
        db.destroy()
          .then(() => process.exit(0))
          .catch(() => process.exit(1));
      });
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((err: Error) => {
    console.error('Failed to run migrations:', err);
    process.exit(1);
  });
