process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import { buildExportData, processImportData } from '../../lib/export-import';
import * as AccountModel from '../../models/account.model';
import * as CredentialModel from '../../models/credential.model';
import * as PennyTestLogModel from '../../models/penny-test-log.model';
import * as factory from '../helpers/factory';
import config from '../../lib/config';
import { decrypt } from '../../lib/encryption';
import type { Knex } from 'knex';
import type { ExportData, EncryptedPayload } from '../../src/types/index';

let db: Knex;

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('buildExportData', () => {
  it('exports accounts with fields', async () => {
    const accountData = factory.account();
    await AccountModel.create(db, accountData);

    const result = await buildExportData(db, ['accounts'], config.vaultEncryptionKey);

    expect(result.meta).toBeDefined();
    expect(result.meta.app).toBe('fintech-pm-toolkit');
    expect(result.meta.version).toBe('1.0.0');
    expect(result.meta.exported_at).toBeDefined();
    expect(result.meta.modules).toEqual(['accounts']);
    expect(result.accounts).toBeDefined();
    expect(result.accounts).toHaveLength(1);
    expect(result.accounts![0].name).toBe(accountData.name);
    expect(result.accounts![0].region_code).toBe(accountData.region_code);
    expect(result.accounts![0].fields).toHaveLength(accountData.fields.length);
    expect(result.accounts![0].fields[0].field_key).toBe('aba_routing_number');
    expect(result.credentials).toBeUndefined();
    expect(result.penny_test_logs).toBeUndefined();
  });

  it('exports credentials with decrypted items', async () => {
    const credData = factory.credential();
    await CredentialModel.create(db, credData);

    const result = await buildExportData(db, ['credentials'], config.vaultEncryptionKey);

    expect(result.credentials).toBeDefined();
    expect(result.credentials).toHaveLength(1);
    expect(result.credentials![0].partner_name).toBe(credData.partner_name);
    expect(result.credentials![0].items).toHaveLength(1);
    // Values should be decrypted (plaintext) in export
    expect(result.credentials![0].items[0].item_value).toBe('test-api-key-12345');
    expect(result.credentials![0].items[0].item_key).toBe('api_key');
  });

  it('exports penny_test_logs', async () => {
    const logData = factory.pennyLog();
    await PennyTestLogModel.create(db, logData);

    const result = await buildExportData(db, ['penny_test_logs'], config.vaultEncryptionKey);

    expect(result.penny_test_logs).toBeDefined();
    expect(result.penny_test_logs).toHaveLength(1);
    expect(result.penny_test_logs![0].partner_name).toBe(logData.partner_name);
    expect(result.penny_test_logs![0].amount).toBe(logData.amount);
    expect(result.penny_test_logs![0].direction).toBe(logData.direction);
  });

  it('exports all modules when all are selected', async () => {
    await AccountModel.create(db, factory.account());
    await CredentialModel.create(db, factory.credential());
    await PennyTestLogModel.create(db, factory.pennyLog());

    const result = await buildExportData(
      db,
      ['accounts', 'credentials', 'penny_test_logs'],
      config.vaultEncryptionKey,
    );

    expect(result.meta.modules).toEqual(['accounts', 'credentials', 'penny_test_logs']);
    expect(result.accounts).toHaveLength(1);
    expect(result.credentials).toHaveLength(1);
    expect(result.penny_test_logs).toHaveLength(1);
  });

  it('returns empty arrays when DB is empty', async () => {
    const result = await buildExportData(
      db,
      ['accounts', 'credentials', 'penny_test_logs'],
      config.vaultEncryptionKey,
    );

    expect(result.accounts).toEqual([]);
    expect(result.credentials).toEqual([]);
    expect(result.penny_test_logs).toEqual([]);
  });
});

describe('processImportData', () => {
  it('round-trips export then import', async () => {
    const accountData = factory.account();
    const credData = factory.credential();
    const logData = factory.pennyLog();

    await AccountModel.create(db, accountData);
    await CredentialModel.create(db, credData);
    await PennyTestLogModel.create(db, logData);

    const exported = await buildExportData(
      db,
      ['accounts', 'credentials', 'penny_test_logs'],
      config.vaultEncryptionKey,
    );

    await cleanTables(db);

    const summary = await processImportData(
      db,
      exported,
      ['accounts', 'credentials', 'penny_test_logs'],
      config.vaultEncryptionKey,
    );

    expect(summary.accounts).toBe(1);
    expect(summary.credentials).toBe(1);
    expect(summary.penny_test_logs).toBe(1);

    // Verify data was actually imported
    const accounts = await db('accounts').select('*');
    expect(accounts).toHaveLength(1);
    expect(accounts[0].name).toBe(accountData.name);

    const credentials = await db('credentials').select('*');
    expect(credentials).toHaveLength(1);
    expect(credentials[0].partner_name).toBe(credData.partner_name);

    const logs = await db('penny_test_logs').select('*');
    expect(logs).toHaveLength(1);
    expect(logs[0].partner_name).toBe(logData.partner_name);
  });

  it('generates new IDs, ignoring old ones', async () => {
    await AccountModel.create(db, factory.account());
    const exported = await buildExportData(db, ['accounts'], config.vaultEncryptionKey);
    const originalId = exported.accounts![0].id;

    await cleanTables(db);

    await processImportData(db, exported, ['accounts'], config.vaultEncryptionKey);
    const accounts = await db('accounts').select('*');
    expect(accounts).toHaveLength(1);
    // New ID is auto-generated, doesn't have to match old one
    expect(accounts[0].id).toBeDefined();
    expect(typeof accounts[0].id).toBe('number');
  });

  it('remaps account_id in penny_test_logs', async () => {
    const account = await AccountModel.create(db, factory.account());
    await PennyTestLogModel.create(db, factory.pennyLog({ account_id: account.id }));

    const exported = await buildExportData(
      db,
      ['accounts', 'penny_test_logs'],
      config.vaultEncryptionKey,
    );

    await cleanTables(db);

    await processImportData(
      db,
      exported,
      ['accounts', 'penny_test_logs'],
      config.vaultEncryptionKey,
    );

    const logs = await db('penny_test_logs').select('*');
    const accounts = await db('accounts').select('*');
    expect(logs).toHaveLength(1);
    expect(accounts).toHaveLength(1);
    // The penny log should reference the new account ID
    expect(logs[0].account_id).toBe(accounts[0].id);
  });

  it('throws on invalid meta.app', async () => {
    const badData: ExportData = {
      meta: {
        app: 'wrong-app',
        version: '1.0.0',
        exported_at: new Date().toISOString(),
        modules: [],
      },
    };

    await expect(
      processImportData(db, badData, ['accounts'], config.vaultEncryptionKey),
    ).rejects.toThrow('Invalid import data: expected app "fintech-pm-toolkit"');
  });

  it('throws on missing meta', async () => {
    const badData = {} as ExportData;

    await expect(
      processImportData(db, badData, ['accounts'], config.vaultEncryptionKey),
    ).rejects.toThrow('Invalid import data: missing meta field');
  });

  it('only imports selected modules', async () => {
    await AccountModel.create(db, factory.account());
    await CredentialModel.create(db, factory.credential());
    await PennyTestLogModel.create(db, factory.pennyLog());

    const exported = await buildExportData(
      db,
      ['accounts', 'credentials', 'penny_test_logs'],
      config.vaultEncryptionKey,
    );

    await cleanTables(db);

    const summary = await processImportData(
      db,
      exported,
      ['accounts'], // only import accounts
      config.vaultEncryptionKey,
    );

    expect(summary.accounts).toBe(1);
    expect(summary.credentials).toBe(0);
    expect(summary.penny_test_logs).toBe(0);

    const accounts = await db('accounts').select('*');
    const credentials = await db('credentials').select('*');
    const logs = await db('penny_test_logs').select('*');
    expect(accounts).toHaveLength(1);
    expect(credentials).toHaveLength(0);
    expect(logs).toHaveLength(0);
  });

  it('re-encrypts credential secrets on import', async () => {
    await CredentialModel.create(db, factory.credential());

    const exported = await buildExportData(db, ['credentials'], config.vaultEncryptionKey);
    // Verify export has plaintext values
    expect(exported.credentials![0].items[0].item_value).toBe('test-api-key-12345');

    await cleanTables(db);

    await processImportData(db, exported, ['credentials'], config.vaultEncryptionKey);

    // Verify the stored value in DB is encrypted (JSON with ct/iv/tag)
    const items = await db('credential_items').select('*');
    expect(items).toHaveLength(1);
    const parsed: EncryptedPayload = JSON.parse(items[0].item_value);
    expect(parsed.ct).toBeDefined();
    expect(parsed.iv).toBeDefined();
    expect(parsed.tag).toBeDefined();

    // Decrypt and verify it matches original
    const decrypted = decrypt(parsed, config.vaultEncryptionKey);
    expect(decrypted).toBe('test-api-key-12345');
  });
});
