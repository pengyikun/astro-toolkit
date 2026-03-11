process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import createApp from '../../src/app';
import * as AccountModel from '../../src/models/account.model';
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

describe('Account Routes', () => {
  describe('GET /accounts', () => {
    it('returns 200 with empty list', async () => {
      const res = await request.get('/accounts');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Accounts');
    });

    it('lists existing accounts', async () => {
      await AccountModel.create(db, factory.account({ name: 'My Test Account' }));
      const res = await request.get('/accounts');
      expect(res.status).toBe(200);
      expect(res.text).toContain('My Test Account');
    });

    it('filters by region_code', async () => {
      await AccountModel.create(db, factory.account({ name: 'US Account', region_code: 'US' }));
      await AccountModel.create(db, factory.account({ name: 'BR Account', region_code: 'BR', currency: 'BRL' }));

      const res = await request.get('/accounts?region_code=US');
      expect(res.status).toBe(200);
      expect(res.text).toContain('US Account');
      expect(res.text).not.toContain('BR Account');
    });

    it('filters by status', async () => {
      await AccountModel.create(db, factory.account({ name: 'Active Acct' }));
      const archived = await AccountModel.create(db, factory.account({ name: 'Archived Acct' }));
      await AccountModel.remove(db, archived.id);

      const res = await request.get('/accounts?status=archived');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Archived Acct');
      expect(res.text).not.toContain('Active Acct');
    });
  });

  describe('POST /accounts', () => {
    it('creates account and redirects', async () => {
      const res = await request
        .post('/accounts')
        .type('form')
        .send({
          name: 'New Account',
          region_code: 'US',
          currency: 'USD',
          account_type: 'mock',
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/accounts\/\d+/);

      const accounts = await db('accounts').select('*');
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('New Account');
    });

    it('creates account with fields via model', async () => {
      const accountData = factory.account({ name: 'With Fields' });
      const account = await AccountModel.create(db, accountData);

      const fields = await db('account_fields').where('account_id', account.id);
      expect(fields).toHaveLength(3);
      expect(fields[0].field_key).toBe('aba_routing_number');
    });

    it('returns 422 with invalid data', async () => {
      const res = await request
        .post('/accounts')
        .type('form')
        .send({
          name: '',
          region_code: '',
          currency: '',
          account_type: 'invalid',
        });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /accounts/:id', () => {
    it('shows account detail', async () => {
      const account = await AccountModel.create(db, factory.account({ name: 'Detail Account' }));
      const res = await request.get(`/accounts/${account.id}`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Detail Account');
    });

    it('returns 404 for non-existent account', async () => {
      const res = await request.get('/accounts/999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /accounts/:id/edit', () => {
    it('shows edit form', async () => {
      const account = await AccountModel.create(db, factory.account({ name: 'Edit Me' }));
      const res = await request.get(`/accounts/${account.id}/edit`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Edit Me');
    });

    it('returns 404 for non-existent account', async () => {
      const res = await request.get('/accounts/999/edit');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /accounts/:id', () => {
    it('updates account and redirects', async () => {
      const account = await AccountModel.create(db, factory.account({ name: 'Old Name' }));

      const res = await request
        .put(`/accounts/${account.id}`)
        .type('form')
        .send({
          name: 'Updated Name',
          region_code: 'US',
          currency: 'USD',
          account_type: 'mock',
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`/accounts/${account.id}`);

      const updated = await db('accounts').where('id', account.id).first();
      expect(updated.name).toBe('Updated Name');
    });

    it('returns 422 with invalid data', async () => {
      const account = await AccountModel.create(db, factory.account());
      const res = await request
        .put(`/accounts/${account.id}`)
        .type('form')
        .send({
          name: '',
          region_code: '',
          currency: '',
          account_type: 'invalid',
        });

      expect(res.status).toBe(422);
    });
  });

  describe('DELETE /accounts/:id', () => {
    it('archives account and redirects', async () => {
      const account = await AccountModel.create(db, factory.account());

      const res = await request.delete(`/accounts/${account.id}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/accounts');

      const archived = await db('accounts').where('id', account.id).first();
      expect(archived.status).toBe('archived');
    });
  });
});
