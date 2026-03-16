process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import * as AccountModel from '../../models/account.model';
import * as factory from '../helpers/factory';
import { getAllRegions, getRegionFields } from '../../lib/region-schemas';
import { parseIBAN } from '../../lib/iban';
import { parseBIC } from '../../lib/bic';
import type { Knex } from 'knex';

let db: Knex;

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('API Route Logic', () => {
  describe('GET /api/regions', () => {
    it('returns at least 12 regions', () => {
      const regions = getAllRegions();
      expect(Array.isArray(regions)).toBe(true);
      expect(regions.length).toBeGreaterThanOrEqual(12);
    });
  });

  describe('GET /api/regions/:code/fields', () => {
    it('returns fields for US', () => {
      const fields = getRegionFields('US');
      expect(fields).not.toBeNull();
      expect(Array.isArray(fields)).toBe(true);
    });

    it('returns null for unknown region ZZ', () => {
      const fields = getRegionFields('ZZ');
      expect(fields).toBeNull();
    });
  });

  describe('POST /api/iban/validate', () => {
    it('validates a correct IBAN', () => {
      const result = parseIBAN('GB29NWBK60161331926819');
      expect(result.valid).toBe(true);
    });
  });

  describe('POST /api/bic/validate', () => {
    it('validates a correct BIC', () => {
      const result = parseBIC('NWBKGB2L');
      expect(result.valid).toBe(true);
    });
  });

  describe('Search (model-level)', () => {
    it('finds a created account by name', async () => {
      await AccountModel.create(db, factory.account({ name: 'SearchableAccount' }));

      const accounts = await AccountModel.searchQuick(db, 'Searchable', 4);
      expect(accounts.length).toBeGreaterThanOrEqual(1);
      expect(accounts[0].name).toBe('SearchableAccount');
    });

    it('returns empty for query shorter than useful', async () => {
      const accounts = await AccountModel.searchQuick(db, 'a', 4);
      expect(accounts).toHaveLength(0);
    });
  });
});
