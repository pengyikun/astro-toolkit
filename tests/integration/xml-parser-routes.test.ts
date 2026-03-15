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

describe('XML Parser Routes', () => {
  describe('GET /xml-parser', () => {
    it('returns 200 and contains "XML Parser"', async () => {
      const res = await request.get('/xml-parser');
      expect(res.status).toBe(200);
      expect(res.text).toContain('XML Parser');
    });
  });

  describe('POST /xml-parser/parse', () => {
    it('parses valid XML input', async () => {
      const res = await request
        .post('/xml-parser/parse')
        .type('form')
        .send({ input: '<root>test</root>' });
      expect(res.status).toBe(200);
    });

    it('handles empty input', async () => {
      const res = await request
        .post('/xml-parser/parse')
        .type('form')
        .send({ input: '' });
      expect(res.status).toBe(200);
    });
  });

  describe('POST /xml-parser/api/parse', () => {
    it('returns JSON with valid field', async () => {
      const res = await request
        .post('/xml-parser/api/parse')
        .type('form')
        .send({ input: '<root>test</root>' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('valid');
    });
  });
});
