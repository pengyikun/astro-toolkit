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

describe('IBAN Routes', () => {
  describe('GET /iban', () => {
    it('returns 200 with checker page', async () => {
      const res = await request.get('/iban');
      expect(res.status).toBe(200);
      expect(res.text).toContain('IBAN');
    });
  });

  describe('POST /iban/check', () => {
    it('returns parsed result for valid IBAN', async () => {
      const res = await request
        .post('/iban/check')
        .type('form')
        .send({ iban: 'GB29NWBK60161331926819' });

      expect(res.status).toBe(200);
      expect(res.text).toContain('GB');
      expect(res.text).toContain('NWBK');
    });

    it('returns error for invalid IBAN', async () => {
      const res = await request
        .post('/iban/check')
        .type('form')
        .send({ iban: 'INVALIDIBAN123' });

      expect(res.status).toBe(200);
      // Should contain some error indication
      expect(res.text).toMatch(/invalid|error|fail/i);
    });

    it('handles empty input', async () => {
      const res = await request
        .post('/iban/check')
        .type('form')
        .send({ iban: '' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/iban/validate', () => {
    it('returns JSON validation result for valid IBAN', async () => {
      const res = await request
        .post('/api/iban/validate')
        .send({ iban: 'GB29NWBK60161331926819' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.country_code).toBe('GB');
      expect(res.body.check_digits).toBe('29');
      expect(res.body.bban).toBe('NWBK60161331926819');
    });

    it('returns JSON validation result for invalid IBAN', async () => {
      const res = await request
        .post('/api/iban/validate')
        .send({ iban: 'XX99INVALID' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.error).toBeDefined();
    });

    it('validates a German IBAN', async () => {
      const res = await request
        .post('/api/iban/validate')
        .send({ iban: 'DE89370400440532013000' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.country_code).toBe('DE');
    });

    it('validates a French IBAN', async () => {
      const res = await request
        .post('/api/iban/validate')
        .send({ iban: 'FR7630006000011234567890189' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.country_code).toBe('FR');
    });
  });
});
