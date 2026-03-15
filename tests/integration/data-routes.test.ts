process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import createApp from '../../src/app';
import * as AccountModel from '../../src/models/account.model';
import * as CredentialModel from '../../src/models/credential.model';
import * as PennyTestLogModel from '../../src/models/penny-test-log.model';
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

describe('Data Export/Import Routes', () => {
  describe('GET /data', () => {
    it('returns 200 with export/import page', async () => {
      const res = await request.get('/data');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Export');
      expect(res.text).toContain('Import');
    });
  });

  describe('POST /data/export', () => {
    it('exports accounts as JSON download', async () => {
      await AccountModel.create(db, factory.account({ name: 'Export Test Account' }));

      const res = await request
        .post('/data/export')
        .type('form')
        .send({ accounts: '1' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.headers['content-disposition']).toMatch(/attachment/);

      const data = JSON.parse(res.text);
      expect(data.meta.app).toBe('fintech-pm-toolkit');
      expect(data.meta.modules).toContain('accounts');
      expect(data.accounts).toHaveLength(1);
      expect(data.accounts[0].name).toBe('Export Test Account');
    });

    it('exports credentials with decrypted values', async () => {
      await CredentialModel.create(db, factory.credential());

      const res = await request
        .post('/data/export')
        .type('form')
        .send({ credentials: '1' });

      expect(res.status).toBe(200);
      const data = JSON.parse(res.text);
      expect(data.credentials).toHaveLength(1);
      expect(data.credentials[0].items[0].item_value).toBe('test-api-key-12345');
    });

    it('exports all modules when all selected', async () => {
      await AccountModel.create(db, factory.account());
      await CredentialModel.create(db, factory.credential());
      await PennyTestLogModel.create(db, factory.pennyLog());

      const res = await request
        .post('/data/export')
        .type('form')
        .send({ accounts: '1', credentials: '1', penny_test_logs: '1' });

      expect(res.status).toBe(200);
      const data = JSON.parse(res.text);
      expect(data.accounts).toHaveLength(1);
      expect(data.credentials).toHaveLength(1);
      expect(data.penny_test_logs).toHaveLength(1);
    });

    it('redirects with error when no modules selected', async () => {
      const res = await request
        .post('/data/export')
        .type('form')
        .send({});

      expect(res.status).toBe(302);
      // Redirects to the router's base URL
      expect(res.headers.location).toMatch(/^\/(data|settings)$/);
    });
  });

  describe('POST /data/import', () => {
    it('imports valid JSON file', async () => {
      // First create data and export it
      await AccountModel.create(db, factory.account({ name: 'Import Test' }));
      await CredentialModel.create(db, factory.credential());

      const exportRes = await request
        .post('/data/export')
        .type('form')
        .send({ accounts: '1', credentials: '1' });

      const exportedJson = exportRes.text;

      // Clean and re-import
      await cleanTables(db);

      const res = await request
        .post('/data/import')
        .attach('file', Buffer.from(exportedJson), 'import.json')
        .field('import_accounts', '1')
        .field('import_credentials', '1');

      expect(res.status).toBe(200);

      // Verify data was imported
      const accounts = await db('accounts').select('*');
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('Import Test');

      const credentials = await db('credentials').select('*');
      expect(credentials).toHaveLength(1);
    });

    it('redirects when no file is provided', async () => {
      const res = await request
        .post('/data/import')
        .type('form')
        .send({});

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/^\/(data|settings)$/);
    });

    it('redirects with error for invalid JSON', async () => {
      const res = await request
        .post('/data/import')
        .attach('file', Buffer.from('not valid json!!!'), 'bad.json');

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/^\/(data|settings)$/);
    });

    it('imports only selected modules', async () => {
      await AccountModel.create(db, factory.account());
      await PennyTestLogModel.create(db, factory.pennyLog());

      const exportRes = await request
        .post('/data/export')
        .type('form')
        .send({ accounts: '1', penny_test_logs: '1' });

      const exportedJson = exportRes.text;
      await cleanTables(db);

      const res = await request
        .post('/data/import')
        .attach('file', Buffer.from(exportedJson), 'import.json')
        .field('import_accounts', '1');
      // Only importing accounts, not penny_test_logs

      expect(res.status).toBe(200);

      const accounts = await db('accounts').select('*');
      expect(accounts).toHaveLength(1);

      const logs = await db('penny_test_logs').select('*');
      expect(logs).toHaveLength(0);
    });
  });
});
