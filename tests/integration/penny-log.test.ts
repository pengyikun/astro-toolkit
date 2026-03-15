process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import createApp from '../../src/app';
import * as PennyTestLogModel from '../../src/models/penny-test-log.model';
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

describe('Penny Log Routes', () => {
  describe('GET /penny-log', () => {
    it('returns 200 with empty list', async () => {
      const res = await request.get('/penny-log');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Penny Test Log');
    });

    it('lists existing logs', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'TXN-VISIBLE' }));
      const res = await request.get('/penny-log');
      expect(res.status).toBe(200);
      expect(res.text).toContain('TXN-VISIBLE');
    });

    it('filters by status', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ status: 'success', reference_id: 'TXN-OK' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ status: 'failed', reference_id: 'TXN-FAIL' }));

      const res = await request.get('/penny-log?status=success');
      expect(res.status).toBe(200);
      expect(res.text).toContain('TXN-OK');
      expect(res.text).not.toContain('TXN-FAIL');
    });

    it('filters by partner_name', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ partner_name: 'Braza', reference_id: 'TXN-BRAZA' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ partner_name: 'Fincra', reference_id: 'TXN-FINCRA' }));

      const res = await request.get('/penny-log?partner_name=Braza');
      expect(res.status).toBe(200);
      expect(res.text).toContain('TXN-BRAZA');
      expect(res.text).not.toContain('TXN-FINCRA');
    });

    it('filters by direction', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ direction: 'inbound', reference_id: 'TXN-IN' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ direction: 'outbound', reference_id: 'TXN-OUT' }));

      const res = await request.get('/penny-log?direction=inbound');
      expect(res.status).toBe(200);
      expect(res.text).toContain('TXN-IN');
      expect(res.text).not.toContain('TXN-OUT');
    });
  });

  describe('POST /penny-log', () => {
    it('creates log entry and redirects', async () => {
      const res = await request
        .post('/penny-log')
        .type('form')
        .send({
          partner_name: 'Braza',
          direction: 'outbound',
          amount: '0.01',
          currency: 'BRL',
          status: 'pending',
          reference_id: 'TXN-NEW-001',
          tested_at: '2025-03-11T12:00:00Z',
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/penny-log\/\d+/);

      const logs = await db('penny_test_logs').select('*');
      expect(logs).toHaveLength(1);
      expect(logs[0].partner_name).toBe('Braza');
      expect(logs[0].amount).toBe(0.01);
    });

    it('returns 422 with invalid data', async () => {
      const res = await request
        .post('/penny-log')
        .type('form')
        .send({
          partner_name: '',
          direction: 'invalid',
          amount: '',
          currency: '',
          status: 'invalid',
          tested_at: '',
        });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /penny-log/:id', () => {
    it('shows log entry detail', async () => {
      const log = await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'TXN-DETAIL' }));
      const res = await request.get(`/penny-log/${log.id}`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('TXN-DETAIL');
    });

    it('returns 404 for non-existent log', async () => {
      const res = await request.get('/penny-log/999');
      expect(res.status).toBe(404);
    });

    it('shows linked account when account_id is set', async () => {
      const account = await AccountModel.create(db, factory.account({ name: 'Linked Account' }));
      const log = await PennyTestLogModel.create(db, factory.pennyLog({ account_id: account.id }));
      const res = await request.get(`/penny-log/${log.id}`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Linked Account');
    });
  });

  describe('GET /penny-log/:id/edit', () => {
    it('shows edit form', async () => {
      const log = await PennyTestLogModel.create(db, factory.pennyLog());
      const res = await request.get(`/penny-log/${log.id}/edit`);
      expect(res.status).toBe(200);
    });

    it('returns 404 for non-existent log', async () => {
      const res = await request.get('/penny-log/999/edit');
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /penny-log/:id', () => {
    it('updates log entry and redirects', async () => {
      const log = await PennyTestLogModel.create(db, factory.pennyLog());

      const res = await request
        .put(`/penny-log/${log.id}`)
        .type('form')
        .send({
          partner_name: 'Updated Partner',
          direction: 'inbound',
          amount: '0.02',
          currency: 'EUR',
          status: 'success',
          tested_at: '2025-03-12T12:00:00Z',
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`/penny-log/${log.id}`);

      const updated = await db('penny_test_logs').where('id', log.id).first();
      expect(updated.partner_name).toBe('Updated Partner');
      expect(updated.status).toBe('success');
    });
  });

  describe('DELETE /penny-log/:id', () => {
    it('deletes log entry and redirects', async () => {
      const log = await PennyTestLogModel.create(db, factory.pennyLog());

      const res = await request.delete(`/penny-log/${log.id}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/penny-log');

      const deleted = await db('penny_test_logs').where('id', log.id).first();
      expect(deleted).toBeUndefined();
    });
  });

  describe('GET /penny-log with currency filter', () => {
    it('filters by currency', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ currency: 'BRL', reference_id: 'TXN-BRL' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ currency: 'EUR', reference_id: 'TXN-EUR' }));

      const res = await request.get('/penny-log?currency=BRL');
      expect(res.status).toBe(200);
      expect(res.text).toContain('TXN-BRL');
      expect(res.text).not.toContain('TXN-EUR');
    });
  });

  describe('GET /penny-log with date range filters', () => {
    it('filters by date_from and date_to', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ tested_at: '2025-01-01T00:00:00Z', reference_id: 'TXN-JAN' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ tested_at: '2025-06-15T00:00:00Z', reference_id: 'TXN-JUN' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ tested_at: '2025-12-01T00:00:00Z', reference_id: 'TXN-DEC' }));

      const res = await request.get('/penny-log?date_from=2025-05-01T00:00:00Z&date_to=2025-07-01T00:00:00Z');
      expect(res.status).toBe(200);
      expect(res.text).toContain('TXN-JUN');
      expect(res.text).not.toContain('TXN-JAN');
      expect(res.text).not.toContain('TXN-DEC');
    });
  });

  describe('GET /penny-log with search filter', () => {
    it('searches by reference_id', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'UNIQUE-REF-XYZ' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'OTHER-REF-123' }));

      const res = await request.get('/penny-log?search=UNIQUE-REF-XYZ');
      expect(res.status).toBe(200);
      expect(res.text).toContain('UNIQUE-REF-XYZ');
      expect(res.text).not.toContain('OTHER-REF-123');
    });
  });

  describe('PUT /penny-log/:id for non-existent id', () => {
    it('returns 404 for non-existent id', async () => {
      const res = await request
        .put('/penny-log/99999')
        .type('form')
        .send({
          partner_name: 'Updated',
          direction: 'inbound',
          amount: '0.02',
          currency: 'EUR',
          status: 'success',
          tested_at: '2025-03-12T12:00:00Z',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /penny-log/:id with invalid data', () => {
    it('returns 422 and re-renders form on validation error', async () => {
      const log = await PennyTestLogModel.create(db, factory.pennyLog());

      const res = await request
        .put(`/penny-log/${log.id}`)
        .type('form')
        .send({
          partner_name: '',
          direction: 'invalid',
          amount: '',
          currency: '',
          status: 'invalid',
          tested_at: '',
        });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /penny-log/new', () => {
    it('shows the new penny log form', async () => {
      const res = await request.get('/penny-log/new');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /penny-log with validation error re-render', () => {
    it('returns 422 and re-renders form with errors', async () => {
      const res = await request
        .post('/penny-log')
        .type('form')
        .send({
          partner_name: '',
          direction: 'invalid',
          amount: 'not-a-number',
          currency: '',
          status: 'bad',
          tested_at: '',
        });

      expect(res.status).toBe(422);
    });
  });
});
