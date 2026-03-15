process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import createApp from '../../src/app';
import * as CredentialModel from '../../src/models/credential.model';
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

describe('Vault Routes', () => {
  describe('GET /vault', () => {
    it('returns 200', async () => {
      const res = await request.get('/vault');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Credentials Vault');
    });
  });

  describe('POST /vault', () => {
    it('creates credential set and redirects', async () => {
      const res = await request
        .post('/vault')
        .type('form')
        .send({
          partner_name: 'Braza',
          environment: 'sandbox',
          label: 'Braza Sandbox Keys',
          notes: 'Test notes',
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toMatch(/\/vault\/\d+/);

      const credentials = await db('credentials').select('*');
      expect(credentials).toHaveLength(1);
      expect(credentials[0].partner_name).toBe('Braza');
    });

    it('creates credential with encrypted items via model', async () => {
      const cred = await CredentialModel.create(db, factory.credential());

      const items = await db('credential_items').where('credential_id', cred.id);
      expect(items).toHaveLength(1);
      // Verify the item value is encrypted in DB (stored as JSON with ct/iv/tag)
      const parsed = JSON.parse(items[0].item_value);
      expect(parsed.ct).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.tag).toBeDefined();
    });

    it('returns 422 with invalid data', async () => {
      const res = await request
        .post('/vault')
        .type('form')
        .send({
          partner_name: '',
          environment: 'invalid',
          label: '',
        });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /vault/:id', () => {
    it('shows credential detail', async () => {
      const cred = await CredentialModel.create(db, factory.credential({ label: 'My Cred Set' }));
      const res = await request.get(`/vault/${cred.id}`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('My Cred Set');
    });

    it('returns 404 for non-existent credential', async () => {
      const res = await request.get('/vault/999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /vault/:id/edit', () => {
    it('shows edit form', async () => {
      const cred = await CredentialModel.create(db, factory.credential({ label: 'Edit Cred' }));
      const res = await request.get(`/vault/${cred.id}/edit`);
      expect(res.status).toBe(200);
      expect(res.text).toContain('Edit Cred');
    });
  });

  describe('PUT /vault/:id', () => {
    it('updates credential and redirects', async () => {
      const cred = await CredentialModel.create(db, factory.credential());

      const res = await request
        .put(`/vault/${cred.id}`)
        .type('form')
        .send({
          partner_name: 'Updated Partner',
          environment: 'staging',
          label: 'Updated Label',
          item_key: 'new_key',
          item_value: 'new_secret',
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toBe(`/vault/${cred.id}`);

      const updated = await db('credentials').where('id', cred.id).first();
      expect(updated.partner_name).toBe('Updated Partner');
      expect(updated.environment).toBe('staging');
    });
  });

  describe('DELETE /vault/:id', () => {
    it('deletes credential and redirects', async () => {
      const cred = await CredentialModel.create(db, factory.credential());

      const res = await request.delete(`/vault/${cred.id}`);
      expect(res.status).toBe(302);
      expect(res.headers.location).toBe('/vault');

      const deleted = await db('credentials').where('id', cred.id).first();
      expect(deleted).toBeUndefined();

      // Cascaded items should also be deleted
      const items = await db('credential_items').where('credential_id', cred.id);
      expect(items).toHaveLength(0);
    });
  });

  describe('GET /api/vault/:id/reveal/:itemId', () => {
    it('decrypts and returns the secret value', async () => {
      const cred = await CredentialModel.create(db, factory.credential());
      const items = await db('credential_items').where('credential_id', cred.id);
      const itemId = items[0].id;

      const res = await request.get(`/api/vault/${cred.id}/reveal/${itemId}`);
      expect(res.status).toBe(200);
      expect(res.body.value).toBe('test-api-key-12345');
    });

    it('returns 404 for non-existent item', async () => {
      const res = await request.get('/api/vault/1/reveal/99999');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /vault with filters', () => {
    it('filters by partner_name', async () => {
      await CredentialModel.create(db, factory.credential({ partner_name: 'Braza', label: 'Braza Keys' }));
      await CredentialModel.create(db, factory.credential({ partner_name: 'Fincra', label: 'Fincra Keys' }));

      const res = await request.get('/vault?partner_name=Braza');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Braza');
      expect(res.text).not.toContain('Fincra Keys');
    });

    it('filters by environment', async () => {
      await CredentialModel.create(db, factory.credential({ environment: 'sandbox', label: 'Sandbox Set' }));
      await CredentialModel.create(db, factory.credential({ environment: 'staging', label: 'Staging Set' }));

      const res = await request.get('/vault?environment=sandbox');
      expect(res.status).toBe(200);
      expect(res.text).toContain('Sandbox Set');
      expect(res.text).not.toContain('Staging Set');
    });

    it('filters by search term', async () => {
      await CredentialModel.create(db, factory.credential({ label: 'UniqueSearchLabel' }));
      await CredentialModel.create(db, factory.credential({ label: 'Other Set' }));

      const res = await request.get('/vault?search=UniqueSearch');
      expect(res.status).toBe(200);
      expect(res.text).toContain('UniqueSearchLabel');
      expect(res.text).not.toContain('Other Set');
    });
  });

  describe('PUT /vault/:id validation and 404', () => {
    it('returns 422 with invalid data', async () => {
      const cred = await CredentialModel.create(db, factory.credential());

      const res = await request
        .put(`/vault/${cred.id}`)
        .type('form')
        .send({
          partner_name: '',
          environment: 'invalid',
          label: '',
        });

      expect(res.status).toBe(422);
    });

    it('returns 404 for non-existent id', async () => {
      const res = await request
        .put('/vault/99999')
        .type('form')
        .send({
          partner_name: 'Updated',
          environment: 'sandbox',
          label: 'Updated Label',
        });

      expect(res.status).toBe(404);
    });
  });

  describe('Credential model with multiple items', () => {
    it('creates credential with multiple items via model', async () => {
      const cred = await CredentialModel.create(db, {
        partner_name: 'MultiItemPartner',
        environment: 'sandbox',
        label: 'Multi-Item Set',
        items: [
          { item_key: 'api_key', item_value: 'key-1', item_type: 'text' as const, file_name: null, file_path: null },
          { item_key: 'client_secret', item_value: 'secret-1', item_type: 'text' as const, file_name: null, file_path: null },
        ],
      });

      const items = await db('credential_items').where('credential_id', cred.id);
      expect(items).toHaveLength(2);
    });

    it('updates credential with new items via model', async () => {
      const cred = await CredentialModel.create(db, factory.credential());
      const updated = await CredentialModel.update(db, cred.id, {
        partner_name: 'UpdatedPartner',
        items: [
          { item_key: 'new_key', item_value: 'new_value', item_type: 'text' as const, file_name: null, file_path: null },
        ],
      });

      expect(updated).not.toBeNull();
      const items = await db('credential_items').where('credential_id', cred.id);
      expect(items).toHaveLength(1);
      expect(items[0].item_key).toBe('new_key');
    });

    it('update returns null for non-existent credential', async () => {
      const result = await CredentialModel.update(db, 99999, { partner_name: 'Nope' });
      expect(result).toBeNull();
    });
  });

  describe('GET /vault/new', () => {
    it('shows the new credential form', async () => {
      const res = await request.get('/vault/new');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/vault/:id/reveal/:itemId with corrupted data', () => {
    it('returns 500 when decryption fails', async () => {
      const cred = await CredentialModel.create(db, factory.credential());
      const items = await db('credential_items').where('credential_id', cred.id);
      const itemId = items[0].id;

      // Corrupt the encrypted value in the database
      await db('credential_items').where('id', itemId).update({ item_value: '{"ct":"bad","iv":"bad","tag":"bad"}' });

      const res = await request.get(`/api/vault/${cred.id}/reveal/${itemId}`);
      expect(res.status).toBe(500);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('GET /api/vault/:id/reveal/:itemId for file type item', () => {
    it('returns null value for file type items', async () => {
      const cred = await CredentialModel.create(db, {
        partner_name: 'FilePartner',
        environment: 'sandbox',
        label: 'File Cred',
        items: [
          { item_key: 'certificate', item_value: '', item_type: 'file' as const, file_name: 'cert.pem', file_path: '/tmp/cert.pem' },
        ],
      });
      const items = await db('credential_items').where('credential_id', cred.id);
      const itemId = items[0].id;

      const res = await request.get(`/api/vault/${cred.id}/reveal/${itemId}`);
      expect(res.status).toBe(200);
      expect(res.body.value).toBeNull();
    });
  });
});
