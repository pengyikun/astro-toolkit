import express from 'express';
import path from 'path';
import compression from 'compression';
import session from 'express-session';
import flash from 'connect-flash';
import methodOverride from 'method-override';
import helmet from 'helmet';
import { csrfToken, csrfProtection } from './middleware/csrf';
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
import jsonParserRoutes from './routes/json-parser.routes';
import xmlParserRoutes from './routes/xml-parser.routes';

export default function createApp(db: Knex): express.Application {
  const app = express();

  // Compression (gzip/deflate — before all other middleware)
  app.use(compression());

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));

  // View engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  if (config.nodeEnv === 'production') {
    app.set('view cache', true);
  }

  // Body parsing
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(methodOverride('_method'));

  // Seed shared locals early so error renders still have safe defaults
  app.use((req, res, next) => {
    res.locals.flash = { success: [], error: [] };
    res.locals.currentPath = req.path;
    res.locals.nodeEnv = config.nodeEnv;
    res.locals.csrfToken = '';
    next();
  });

  // Static files with cache headers
  app.use(
    express.static(path.join(__dirname, '..', 'public'), {
      maxAge: config.nodeEnv === 'production' ? '7d' : 0,
      etag: true,
    })
  );

  // Sessions & flash
  app.use(session({ secret: config.sessionSecret, resave: false, saveUninitialized: false }));
  app.use(flash());

  // CSRF protection
  app.use(csrfToken);
  app.use(csrfProtection);

  // Locals middleware
  app.use((req, res, next) => {
    res.locals.flash = { success: req.flash('success'), error: req.flash('error') };
    res.locals.currentPath = req.path;
    res.locals.nodeEnv = config.nodeEnv;
    res.locals.csrfToken = (req as any).csrfToken?.() || '';
    next();
  });

  // Dashboard
  app.get('/', async (_req, res, next) => {
    try {
      const [accountCount, credentialCount, pennyLogCount, recentLogs, statusCounts] = await Promise.all([
        AccountModel.count(db),
        CredentialModel.count(db),
        PennyTestLogModel.count(db),
        PennyTestLogModel.findRecent(db, 5),
        PennyTestLogModel.countByStatus(db),
      ]);
      res.render('dashboard', {
        title: 'Dashboard',
        accountCount,
        credentialCount,
        pennyLogCount,
        recentLogs,
        statusCounts,
      });
    } catch (err) { next(err); }
  });

  // HTML routes
  app.use('/accounts', accountsRoutes(db));
  app.use('/iban', ibanRoutes());
  app.use('/bic', bicRoutes(db));
  app.use('/vault', vaultRoutes(db));
  app.use('/penny-log', pennyLogRoutes(db));
  app.use('/settings', dataRoutes(db));
  app.use('/data', dataRoutes(db));
  app.use('/json-parser', jsonParserRoutes());
  app.use('/xml-parser', xmlParserRoutes());

  // JSON API routes
  app.get('/api/regions', (_req, res) => res.json(getAllRegions()));

  app.get('/api/regions/:code/fields', (req, res) => {
    const fields = getRegionFields(req.params.code.toUpperCase());
    if (!fields) return res.status(404).json({ error: { message: 'Region not found', status: 404 } });
    res.json(fields);
  });

  app.post('/api/iban/validate', (req, res) => res.json(parseIBAN(req.body.iban)));
  app.post('/api/bic/validate', (req, res) => res.json(parseBIC(req.body.bic)));

  app.get('/api/search', async (req, res, next) => {
    try {
      const query = typeof req.query.q === 'string'
        ? req.query.q.replace(/\s+/g, ' ').trim().slice(0, 120)
        : '';
      if (query.length < 2) {
        return res.json({
          query,
          results: {
            accounts: [],
            credentials: [],
            transactions: [],
          },
          total: 0,
        });
      }

      const [accounts, credentials, transactions] = await Promise.all([
        AccountModel.searchQuick(db, query, 4),
        CredentialModel.searchQuick(db, query, 4),
        PennyTestLogModel.searchQuick(db, query, 4),
      ]);

      const payload = {
        query,
        results: {
          accounts: accounts.map((account) => ({
            id: account.id,
            type: 'account',
            title: account.name,
            meta: `${account.region_code} · ${account.currency} · ${account.account_type}`,
            url: `/accounts/${account.id}`,
          })),
          credentials: credentials.map((credential) => ({
            id: credential.id,
            type: 'credential',
            title: credential.label,
            meta: `${credential.partner_name} · ${credential.environment}`,
            url: `/vault/${credential.id}`,
          })),
          transactions: transactions.map((log) => ({
            id: log.id,
            type: 'transaction',
            title: log.reference_id || `${log.partner_name} run`,
            meta: `${log.partner_name} · ${log.amount} ${log.currency} · ${log.status}`,
            url: `/penny-log/${log.id}`,
          })),
        },
      };

      res.json({
        ...payload,
        total:
          payload.results.accounts.length +
          payload.results.credentials.length +
          payload.results.transactions.length,
      });
    } catch (err) {
      next(err);
    }
  });

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
