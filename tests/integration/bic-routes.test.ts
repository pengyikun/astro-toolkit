process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { setupTestDb, teardownTestDb } from '../helpers/setup';
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

describe('BIC Routes', () => {
  describe('GET /bic', () => {
    it('returns 200 with checker page', async () => {
      const res = await request.get('/bic');
      expect(res.status).toBe(200);
      expect(res.text).toContain('BIC');
    });
  });

  describe('POST /bic/check', () => {
    it('returns parsed result for valid 8-char BIC', async () => {
      const res = await request
        .post('/bic/check')
        .type('form')
        .send({ bic: 'NWBKGB2L' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('NWBK');
      expect(res.text).toContain('GB');
    });

    it('returns parsed result for valid 11-char BIC', async () => {
      const res = await request
        .post('/bic/check')
        .type('form')
        .send({ bic: 'NWBKGB2LXXX' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('NWBK');
    });

    it('returns error for invalid BIC', async () => {
      const res = await request
        .post('/bic/check')
        .type('form')
        .send({ bic: 'INVALID' });

      expect(res.status).toBe(200);
      expect(res.text).toMatch(/invalid|error|fail/i);
    });

    it('handles empty input', async () => {
      const res = await request
        .post('/bic/check')
        .type('form')
        .send({ bic: '' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/bic/validate', () => {
    it('returns JSON for valid 8-char BIC', async () => {
      const res = await request
        .post('/api/bic/validate')
        .send({ bic: 'NWBKGB2L' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.institution_code).toBe('NWBK');
      expect(res.body.country_code).toBe('GB');
      expect(res.body.location_code).toBe('2L');
      expect(res.body.branch_code).toBeNull();
      expect(res.body.is_primary_office).toBe(true);
    });

    it('returns JSON for valid 11-char BIC', async () => {
      const res = await request
        .post('/api/bic/validate')
        .send({ bic: 'DEUTDEFF500' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.institution_code).toBe('DEUT');
      expect(res.body.country_code).toBe('DE');
      expect(res.body.branch_code).toBe('500');
      expect(res.body.is_primary_office).toBe(false);
    });

    it('detects test BIC', async () => {
      const res = await request
        .post('/api/bic/validate')
        .send({ bic: 'NWBKGB20' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.is_test_bic).toBe(true);
    });

    it('returns JSON for invalid BIC', async () => {
      const res = await request
        .post('/api/bic/validate')
        .send({ bic: '12345' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBeDefined();
    });
  });
});
