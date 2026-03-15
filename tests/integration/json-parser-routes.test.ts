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

describe('JSON Parser Routes', () => {
  describe('GET /json-parser', () => {
    it('returns 200 and contains "JSON Parser"', async () => {
      const res = await request.get('/json-parser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('JSON Parser');
    });
  });

  describe('POST /json-parser/parse', () => {
    it('parses valid JSON input', async () => {
      const res = await request
        .post('/json-parser/parse')
        .type('form')
        .send({ input: '{"key": "value"}' });
      expect(res.status).toBe(200);
    });

    it('handles empty input', async () => {
      const res = await request
        .post('/json-parser/parse')
        .type('form')
        .send({ input: '' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /json-parser/api/parse', () => {
    it('returns JSON with valid field', async () => {
      const res = await request
        .post('/json-parser/api/parse')
        .type('form')
        .send({ input: '{"key": "value"}' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('valid');
    });
  });
});
