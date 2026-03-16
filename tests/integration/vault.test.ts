process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import * as CredentialModel from '../../models/credential.model';
import * as factory from '../helpers/factory';
import type { Knex } from 'knex';

let db: Knex;

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('Vault (Credential Model) Integration', () => {
  describe('create', () => {
    it('creates credential set', async () => {
      const cred = await CredentialModel.create(db, factory.credential());
      expect(cred.id).toBeDefined();
      expect(cred.partner_name).toBe('TestPartner');

      const rows = await db('credentials').select('*');
      expect(rows).toHaveLength(1);
    });

    it('creates credential with encrypted items', async () => {
      const cred = await CredentialModel.create(db, factory.credential());

      const items = await db('credential_items').where('credential_id', cred.id);
      expect(items).toHaveLength(1);
      // Verify the item value is encrypted in DB (stored as JSON with ct/iv/tag)
      const parsed = JSON.parse(items[0].item_value);
      expect(parsed.ct).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.tag).toBeDefined();
    });

    it('creates credential with multiple items', async () => {
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
  });

  describe('findAll', () => {
    it('filters by partner_name', async () => {
      await CredentialModel.create(db, factory.credential({ partner_name: 'Braza', label: 'Braza Keys' }));
      await CredentialModel.create(db, factory.credential({ partner_name: 'Fincra', label: 'Fincra Keys' }));

      const result = await CredentialModel.findAll(db, { partner_name: 'Braza' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].partner_name).toBe('Braza');
    });

    it('filters by environment', async () => {
      await CredentialModel.create(db, factory.credential({ environment: 'sandbox', label: 'Sandbox Set' }));
      await CredentialModel.create(db, factory.credential({ environment: 'staging', label: 'Staging Set' }));

      const result = await CredentialModel.findAll(db, { environment: 'sandbox' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].label).toBe('Sandbox Set');
    });

    it('filters by search term', async () => {
      await CredentialModel.create(db, factory.credential({ label: 'UniqueSearchLabel' }));
      await CredentialModel.create(db, factory.credential({ label: 'Other Set' }));

      const result = await CredentialModel.findAll(db, { search: 'UniqueSearch' });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].label).toBe('UniqueSearchLabel');
    });
  });

  describe('findById', () => {
    it('returns credential with items', async () => {
      const cred = await CredentialModel.create(db, factory.credential({ label: 'My Cred Set' }));
      const found = await CredentialModel.findById(db, cred.id);
      expect(found).not.toBeNull();
      expect(found!.label).toBe('My Cred Set');
    });

    it('returns null for non-existent credential', async () => {
      const found = await CredentialModel.findById(db, 999);
      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('updates credential metadata', async () => {
      const cred = await CredentialModel.create(db, factory.credential());
      const updated = await CredentialModel.update(db, cred.id, {
        partner_name: 'Updated Partner',
        environment: 'staging',
      });

      expect(updated).not.toBeNull();
      const row = await db('credentials').where('id', cred.id).first();
      expect(row.partner_name).toBe('Updated Partner');
      expect(row.environment).toBe('staging');
    });

    it('updates credential with new items', async () => {
      const cred = await CredentialModel.create(db, factory.credential());
      await CredentialModel.update(db, cred.id, {
        partner_name: 'UpdatedPartner',
        items: [
          { item_key: 'new_key', item_value: 'new_value', item_type: 'text' as const, file_name: null, file_path: null },
        ],
      });

      const items = await db('credential_items').where('credential_id', cred.id);
      expect(items).toHaveLength(1);
      expect(items[0].item_key).toBe('new_key');
    });

    it('returns null for non-existent credential', async () => {
      const result = await CredentialModel.update(db, 99999, { partner_name: 'Nope' });
      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('deletes credential and cascades to items', async () => {
      const cred = await CredentialModel.create(db, factory.credential());
      await CredentialModel.remove(db, cred.id);

      const deleted = await db('credentials').where('id', cred.id).first();
      expect(deleted).toBeUndefined();

      const items = await db('credential_items').where('credential_id', cred.id);
      expect(items).toHaveLength(0);
    });
  });

  describe('revealItem', () => {
    it('decrypts and returns the secret value', async () => {
      const cred = await CredentialModel.create(db, factory.credential());
      const items = await db('credential_items').where('credential_id', cred.id);
      const itemId = items[0].id;

      const result = await CredentialModel.revealItem(db, itemId);
      expect(result).not.toBeNull();
      expect(result!.decrypted_value).toBe('test-api-key-12345');
    });

    it('returns null for non-existent item', async () => {
      const result = await CredentialModel.revealItem(db, 99999);
      expect(result).toBeNull();
    });

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

      const result = await CredentialModel.revealItem(db, itemId);
      expect(result).not.toBeNull();
      expect(result!.decrypted_value).toBeNull();
    });
  });
});
