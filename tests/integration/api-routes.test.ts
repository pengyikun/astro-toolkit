process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import createApp from '../../src/app';
import * as AccountModel from '../../src/models/account.model';
import * as CredentialModel from '../../src/models/credential.model';
import * as PennyTestLogModel from '../../src/models/penny-test-log.model';
import * as factory from '../helpers/factory';
import type { Knex } from 'knex';

let db: Knex;
let request: supertest.Agent;

beforeAll(async () => {
  db = await setupTestDb();
  const app = createApp(db);
  request = supertest.agent(app);
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('API Routes', () => {
  describe('GET /api/regions', () => {
    it('returns 200 with at least 12 regions', async () => {
      const res = await request.get('/api/regions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('GET /api/regions/:code/fields', () => {
    it('returns 200 with fields for US', async () => {
      const res = await request.get('/api/regions/US/fields');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('returns 404 for unknown region ZZ', async () => {
      const res = await request.get('/api/regions/ZZ/fields');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/search', () => {
    it('returns 200 with results object', async () => {
      const res = await request.get('/api/search?q=test');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
    });

    it('returns total: 0 for query shorter than 2 chars', async () => {
      const res = await request.get('/api/search?q=a');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });

    it('finds a created account by name', async () => {
      await AccountModel.create(db, factory.account({ name: 'SearchableAccount' }));

      const res = await request.get('/api/search?q=Searchable');
      expect(res.status).toBe(200);
      expect(res.body.results.accounts.length).toBeGreaterThanOrEqual(1);
      expect(res.body.results.accounts[0].title).toBe('SearchableAccount');
    });
  });

  describe('POST /api/iban/validate', () => {
    it('validates a correct IBAN', async () => {
      const res = await request
        .post('/api/iban/validate')
        .send({ iban: 'GB29NWBK60161331926819' });
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });
  });

  describe('POST /api/bic/validate', () => {
    it('validates a correct BIC', async () => {
      const res = await request
        .post('/api/bic/validate')
        .send({ bic: 'NWBKGB2L' });
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });
  });
});
