process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import * as AccountModel from '../../models/account.model';
import * as factory from '../helpers/factory';
import type { Knex } from 'knex';

let db: Knex;

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('Account Model Integration', () => {
  describe('create', () => {
    it('creates account with basic fields', async () => {
      const account = await AccountModel.create(db, factory.account({ name: 'New Account' }));
      expect(account.id).toBeDefined();
      expect(account.name).toBe('New Account');

      const rows = await db('accounts').select('*');
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('New Account');
    });

    it('creates account with region-specific fields', async () => {
      const accountData = factory.account({
        name: 'BR Account',
        region_code: 'BR',
        currency: 'BRL',
        fields: [
          { field_key: 'pix_key', field_label: 'PIX Key', field_value: '12345678901', field_type: 'text' as const, is_custom: 0, sort_order: 0 },
          { field_key: 'beneficiary_name', field_label: 'Beneficiary Name', field_value: 'Maria Silva', field_type: 'text' as const, is_custom: 0, sort_order: 1 },
        ],
      });
      const account = await AccountModel.create(db, accountData);

      const fields = await db('account_fields').where('account_id', account.id);
      expect(fields).toHaveLength(2);
      const pixField = fields.find((f: any) => f.field_key === 'pix_key');
      expect(pixField).toBeDefined();
      expect(pixField.field_value).toBe('12345678901');
    });

    it('creates account with custom fields (is_custom = 1)', async () => {
      const accountData = factory.account({
        name: 'Custom Fields Account',
        fields: [
          { field_key: 'my_custom_field', field_label: 'My Custom Field', field_value: 'custom_value', field_type: 'text' as const, is_custom: 1, sort_order: 0 },
        ],
      });
      const account = await AccountModel.create(db, accountData);

      const fields = await db('account_fields').where('account_id', account.id);
      const customField = fields.find((f: any) => f.field_key === 'my_custom_field');
      expect(customField).toBeDefined();
      expect(customField.is_custom).toBe(1);
      expect(customField.field_value).toBe('custom_value');
    });

    it('creates account with generic bank fields', async () => {
      const account = await AccountModel.create(db, {
        name: 'Generic Fields Account',
        region_code: 'US',
        currency: 'USD',
        account_type: 'mock',
        fields: [
          { field_key: 'generic_account_holder', field_label: 'Account Holder', field_value: 'John Doe', field_type: 'text' as const, is_custom: 0, sort_order: 0 },
          { field_key: 'generic_bank_name', field_label: 'Bank Name', field_value: 'Test Bank', field_type: 'text' as const, is_custom: 0, sort_order: 1 },
        ],
      });

      const fields = await db('account_fields').where('account_id', account.id);
      expect(fields).toHaveLength(2);
      expect(fields.find((f: any) => f.field_key === 'generic_account_holder')).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('returns empty list initially', async () => {
      const result = await AccountModel.findAll(db, {});
      expect(result.data).toHaveLength(0);
    });

    it('lists existing accounts', async () => {
      await AccountModel.create(db, factory.account({ name: 'My Test Account' }));
      const result = await AccountModel.findAll(db, {});
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('My Test Account');
    });

    it('filters by region_code', async () => {
      await AccountModel.create(db, factory.account({ name: 'US Account', region_code: 'US' }));
      await AccountModel.create(db, factory.account({ name: 'BR Account', region_code: 'BR', currency: 'BRL' }));

      const result = await AccountModel.findAll(db, { region_code: 'US' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('US Account');
    });

    it('filters by status', async () => {
      await AccountModel.create(db, factory.account({ name: 'Active Acct' }));
      const archived = await AccountModel.create(db, factory.account({ name: 'Archived Acct' }));
      await AccountModel.remove(db, archived.id);

      const result = await AccountModel.findAll(db, { status: 'archived' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Archived Acct');
    });

    it('filters by account_type', async () => {
      await AccountModel.create(db, factory.account({ name: 'Mock Acct', account_type: 'mock' }));
      await AccountModel.create(db, factory.account({ name: 'Real Acct', account_type: 'real' }));

      const result = await AccountModel.findAll(db, { account_type: 'mock' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('Mock Acct');
    });

    it('filters by search term', async () => {
      await AccountModel.create(db, factory.account({ name: 'MySearch Target' }));
      await AccountModel.create(db, factory.account({ name: 'Other Account' }));

      const result = await AccountModel.findAll(db, { search: 'MySearch' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('MySearch Target');
    });

    it('paginates results', async () => {
      await AccountModel.create(db, factory.account({ name: 'PgAcct1' }));
      await AccountModel.create(db, factory.account({ name: 'PgAcct2' }));
      await AccountModel.create(db, factory.account({ name: 'PgAcct3' }));

      const result = await AccountModel.findAll(db, { page: 2, perPage: 2 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
    });
  });

  describe('findById', () => {
    it('returns account with fields', async () => {
      const account = await AccountModel.create(db, factory.account({ name: 'Detail Account' }));
      const found = await AccountModel.findById(db, account.id);
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Detail Account');
      expect(found!.fields).toBeDefined();
    });

    it('returns null for non-existent account', async () => {
      const found = await AccountModel.findById(db, 999);
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates account name', async () => {
      const account = await AccountModel.create(db, factory.account({ name: 'Old Name' }));
      await AccountModel.update(db, account.id, { name: 'Updated Name' });

      const updated = await db('accounts').where('id', account.id).first();
      expect(updated.name).toBe('Updated Name');
    });

    it('replaces fields on region change', async () => {
      const account = await AccountModel.create(db, factory.account({ name: 'US Account', region_code: 'US' }));
      await AccountModel.update(db, account.id, {
        region_code: 'BR',
        currency: 'BRL',
        fields: [
          { field_key: 'pix_key', field_label: 'PIX Key', field_value: 'newpix', field_type: 'text' as const, is_custom: 0, sort_order: 0 },
        ],
      });

      const fields = await db('account_fields').where('account_id', account.id);
      expect(fields).toHaveLength(1);
      expect(fields[0].field_key).toBe('pix_key');
    });
  });

  describe('remove (soft delete)', () => {
    it('archives account', async () => {
      const account = await AccountModel.create(db, factory.account());
      await AccountModel.remove(db, account.id);

      const archived = await db('accounts').where('id', account.id).first();
      expect(archived.status).toBe('archived');
    });
  });
});
