import express from 'express';
import path from 'path';
import session from 'express-session';
import flash from 'connect-flash';
import methodOverride from 'method-override';
import helmet from 'helmet';
import type { Knex } from 'knex';

import config from './config';
import errorHandler from './middleware/error-handler';
import * as AccountModel from './models/account.model';
import * as CredentialModel from './models/credential.model';
import * as PennyTestLogModel from './models/penny-test-log.model';
import { getAllRegions, getRegionFields } from './lib/region-schemas';
import { parseIBAN } from './lib/iban';
import { parseBIC } from './lib/bic';

import accountsRoutes from './routes/accounts.routes';
import ibanRoutes from './routes/iban.routes';
import bicRoutes from './routes/bic.routes';
import vaultRoutes from './routes/vault.routes';
import pennyLogRoutes from './routes/penny-log.routes';
import dataRoutes from './routes/data.routes';

export default function createApp(db: Knex): express.Application {
  const app = express();

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));

  // View engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // Body parsing
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(methodOverride('_method'));

  // Static files
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Sessions & flash
  app.use(session({ secret: config.sessionSecret, resave: false, saveUninitialized: false }));
  app.use(flash());

  // Locals middleware
  app.use((req, res, next) => {
    res.locals.flash = { success: req.flash('success'), error: req.flash('error') };
    res.locals.currentPath = req.path;
    res.locals.nodeEnv = config.nodeEnv;
    next();
  });

  // Dashboard
  app.get('/', async (_req, res, next) => {
    try {
      const [accountCount, credentialCount, pennyLogCount] = await Promise.all([
        AccountModel.count(db),
        CredentialModel.count(db),
        PennyTestLogModel.count(db),
      ]);
      res.render('dashboard', { title: 'Dashboard', accountCount, credentialCount, pennyLogCount });
    } catch (err) { next(err); }
  });

  // HTML routes
  app.use('/accounts', accountsRoutes(db));
  app.use('/iban', ibanRoutes());
  app.use('/bic', bicRoutes());
  app.use('/vault', vaultRoutes(db));
  app.use('/penny-log', pennyLogRoutes(db));
  app.use('/data', dataRoutes(db));

  // JSON API routes
  app.get('/api/regions', (_req, res) => res.json(getAllRegions()));

  app.get('/api/regions/:code/fields', (req, res) => {
    const fields = getRegionFields(req.params.code.toUpperCase());
    if (!fields) return res.status(404).json({ error: { message: 'Region not found', status: 404 } });
    res.json(fields);
  });

  app.post('/api/iban/validate', (req, res) => res.json(parseIBAN(req.body.iban)));
  app.post('/api/bic/validate', (req, res) => res.json(parseBIC(req.body.bic)));

  app.get('/api/vault/:id/reveal/:itemId', async (req, res, next) => {
    try {
      const result = await CredentialModel.revealItem(db, Number(req.params.itemId));
      if (!result) return res.status(404).json({ error: { message: 'Item not found', status: 404 } });
      res.json({ value: result.decrypted_value });
    } catch (err) { next(err); }
  });

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
