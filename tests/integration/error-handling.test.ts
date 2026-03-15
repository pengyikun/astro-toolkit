process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import createApp from '../../src/app';
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

describe('Error Handling', () => {
  describe('GET /accounts/notanumber', () => {
    it('handles non-numeric ID gracefully', async () => {
      const res = await request.get('/accounts/notanumber');
      // parseId middleware returns 400 for non-numeric IDs
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/vault/1/reveal/notanumber', () => {
    it('returns error JSON for non-numeric item ID', async () => {
      const res = await request.get('/api/vault/1/reveal/notanumber');
      expect(res.status).toBeGreaterThanOrEqual(400);
      // API routes should return JSON
      expect(res.headers['content-type']).toMatch(/json/);
    });
  });

  describe('GET /nonexistent-route', () => {
    it('returns 404 or error for unknown route', async () => {
      const res = await request.get('/nonexistent-route');
      // Express returns 404 for unmatched routes
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /vault/notanumber', () => {
    it('handles non-numeric vault ID', async () => {
      const res = await request.get('/vault/notanumber');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /penny-log/notanumber', () => {
    it('handles non-numeric penny-log ID', async () => {
      const res = await request.get('/penny-log/notanumber');
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
