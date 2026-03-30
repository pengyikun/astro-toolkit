import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import * as AccountModel from '../../models/account.model';
import * as CredentialModel from '../../models/credential.model';
import * as PennyTestLogModel from '../../models/penny-test-log.model';
import { buildExportData, processImportData } from '../../lib/export-import';
import config from '../../lib/config';
import * as factory from '../helpers/factory';
import type { Knex } from 'knex';

let db: Knex;
const key = config.vaultEncryptionKey;

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('Data Export/Import Integration', () => {
  describe('export', () => {
    it('exports accounts as JSON', async () => {
      await AccountModel.create(db, factory.account({ name: 'Export Test Account' }));

      const data = await buildExportData(db, ['accounts'], key);
      expect(data.meta.app).toBe('astro-toolkit');
      expect(data.meta.modules).toContain('accounts');
      expect(data.accounts).toHaveLength(1);
      expect(data.accounts![0].name).toBe('Export Test Account');
    });

    it('exports credentials with decrypted values', async () => {
      await CredentialModel.create(db, factory.credential());

      const data = await buildExportData(db, ['credentials'], key);
      expect(data.credentials).toHaveLength(1);
      expect(data.credentials![0].items[0].item_value).toBe('test-api-key-12345');
    });

    it('exports all modules when all selected', async () => {
      await AccountModel.create(db, factory.account());
      await CredentialModel.create(db, factory.credential());
      await PennyTestLogModel.create(db, factory.pennyLog());

      const data = await buildExportData(db, ['accounts', 'credentials', 'penny_test_logs'], key);
      expect(data.accounts).toHaveLength(1);
      expect(data.credentials).toHaveLength(1);
      expect(data.penny_test_logs).toHaveLength(1);
    });
  });

  describe('import', () => {
    it('imports valid export data (round-trip)', async () => {
      await AccountModel.create(db, factory.account({ name: 'Import Test' }));
      await CredentialModel.create(db, factory.credential());

      const exported = await buildExportData(db, ['accounts', 'credentials'], key);

      await cleanTables(db);

      await processImportData(db, exported, ['accounts', 'credentials'], key);

      const accounts = await db('accounts').select('*');
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('Import Test');

      const credentials = await db('credentials').select('*');
      expect(credentials).toHaveLength(1);
    });

    it('imports only selected modules', async () => {
      await AccountModel.create(db, factory.account());
      await PennyTestLogModel.create(db, factory.pennyLog());

      const exported = await buildExportData(db, ['accounts', 'penny_test_logs'], key);
      await cleanTables(db);

      await processImportData(db, exported, ['accounts'], key);

      const accounts = await db('accounts').select('*');
      expect(accounts).toHaveLength(1);

      const logs = await db('penny_test_logs').select('*');
      expect(logs).toHaveLength(0);
    });
  });
});
