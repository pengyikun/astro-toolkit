process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import * as PennyTestLogModel from '../../models/penny-test-log.model';
import * as AccountModel from '../../models/account.model';
import * as factory from '../helpers/factory';
import type { Knex } from 'knex';

let db: Knex;

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('Penny Log Model Integration', () => {
  describe('create', () => {
    it('creates log entry', async () => {
      const log = await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'TXN-NEW-001' }));
      expect(log.id).toBeDefined();

      const rows = await db('penny_test_logs').select('*');
      expect(rows).toHaveLength(1);
      expect(rows[0].partner_name).toBe('TestPartner');
      expect(rows[0].amount).toBe(0.01);
    });
  });

  describe('findAll', () => {
    it('returns empty list initially', async () => {
      const result = await PennyTestLogModel.findAll(db, {});
      expect(result.data).toHaveLength(0);
    });

    it('lists existing logs', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'TXN-VISIBLE' }));
      const result = await PennyTestLogModel.findAll(db, {});
      expect(result.data).toHaveLength(1);
    });

    it('filters by status', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ status: 'success', reference_id: 'TXN-OK' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ status: 'failed', reference_id: 'TXN-FAIL' }));

      const result = await PennyTestLogModel.findAll(db, { status: 'success' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].reference_id).toBe('TXN-OK');
    });

    it('filters by partner_name', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ partner_name: 'Braza', reference_id: 'TXN-BRAZA' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ partner_name: 'Fincra', reference_id: 'TXN-FINCRA' }));

      const result = await PennyTestLogModel.findAll(db, { partner_name: 'Braza' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].reference_id).toBe('TXN-BRAZA');
    });

    it('filters by direction', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ direction: 'inbound', reference_id: 'TXN-IN' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ direction: 'outbound', reference_id: 'TXN-OUT' }));

      const result = await PennyTestLogModel.findAll(db, { direction: 'inbound' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].reference_id).toBe('TXN-IN');
    });

    it('filters by currency', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ currency: 'BRL', reference_id: 'TXN-BRL' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ currency: 'EUR', reference_id: 'TXN-EUR' }));

      const result = await PennyTestLogModel.findAll(db, { currency: 'BRL' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].reference_id).toBe('TXN-BRL');
    });

    it('filters by date range', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ tested_at: '2025-01-01T00:00:00Z', reference_id: 'TXN-JAN' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ tested_at: '2025-06-15T00:00:00Z', reference_id: 'TXN-JUN' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ tested_at: '2025-12-01T00:00:00Z', reference_id: 'TXN-DEC' }));

      const result = await PennyTestLogModel.findAll(db, { date_from: '2025-05-01T00:00:00Z', date_to: '2025-07-01T00:00:00Z' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].reference_id).toBe('TXN-JUN');
    });

    it('searches by reference_id', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'UNIQUE-REF-XYZ' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'OTHER-REF-123' }));

      const result = await PennyTestLogModel.findAll(db, { search: 'UNIQUE-REF-XYZ' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].reference_id).toBe('UNIQUE-REF-XYZ');
    });
  });

  describe('findById', () => {
    it('returns log entry', async () => {
      const log = await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'TXN-DETAIL' }));
      const found = await PennyTestLogModel.findById(db, log.id);
      expect(found).not.toBeNull();
      expect(found!.reference_id).toBe('TXN-DETAIL');
    });

    it('returns null for non-existent log', async () => {
      const found = await PennyTestLogModel.findById(db, 999);
      expect(found).toBeNull();
    });

    it('includes linked account when account_id is set', async () => {
      const account = await AccountModel.create(db, factory.account({ name: 'Linked Account' }));
      const log = await PennyTestLogModel.create(db, factory.pennyLog({ account_id: account.id }));
      const found = await PennyTestLogModel.findById(db, log.id);
      expect(found).not.toBeNull();
      expect(found!.account_id).toBe(account.id);
    });
  });

  describe('update', () => {
    it('updates log entry', async () => {
      const log = await PennyTestLogModel.create(db, factory.pennyLog());
      await PennyTestLogModel.update(db, log.id, {
        partner_name: 'Updated Partner',
        status: 'success',
      });

      const updated = await db('penny_test_logs').where('id', log.id).first();
      expect(updated.partner_name).toBe('Updated Partner');
      expect(updated.status).toBe('success');
    });
  });

  describe('remove', () => {
    it('deletes log entry', async () => {
      const log = await PennyTestLogModel.create(db, factory.pennyLog());
      await PennyTestLogModel.remove(db, log.id);

      const deleted = await db('penny_test_logs').where('id', log.id).first();
      expect(deleted).toBeUndefined();
    });
  });

  describe('count', () => {
    it('counts all logs', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog());
      await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'TXN-002' }));
      const count = await PennyTestLogModel.count(db);
      expect(count).toBe(2);
    });
  });

  describe('findRecent', () => {
    it('returns most recent logs', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ partner_name: 'Old', tested_at: '2025-01-01T00:00:00Z' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ partner_name: 'New', tested_at: '2025-12-01T00:00:00Z' }));
      const recent = await PennyTestLogModel.findRecent(db, 1);
      expect(recent).toHaveLength(1);
      expect(recent[0].partner_name).toBe('New');
    });
  });

  describe('countByStatus', () => {
    it('groups counts by status', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ status: 'success' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ status: 'success', reference_id: 'TXN-S2' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ status: 'failed', reference_id: 'TXN-F1' }));
      const counts = await PennyTestLogModel.countByStatus(db);
      expect(counts.success).toBe(2);
      expect(counts.failed).toBe(1);
    });
  });

  describe('searchQuick', () => {
    it('finds logs by reference_id', async () => {
      await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'UNIQUE-REF-123' }));
      await PennyTestLogModel.create(db, factory.pennyLog({ reference_id: 'OTHER-REF' }));
      const results = await PennyTestLogModel.searchQuick(db, 'UNIQUE-REF');
      expect(results).toHaveLength(1);
      expect(results[0].reference_id).toBe('UNIQUE-REF-123');
    });
  });
});
