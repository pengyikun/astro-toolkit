process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '../helpers/setup';
import { findLEIByBIC } from '../../src/lib/lei-lookup';
import type { Knex } from 'knex';

let db: Knex;

beforeAll(async () => {
  db = await setupTestDb();
  // Insert test data into bic_lei_mappings
  await db('bic_lei_mappings').insert([
    { bic: 'NWBKGB2LXXX', lei: 'TEST123LEI' },
    { bic: 'DEUTDEFF', lei: 'DEUT_LEI' },
  ]);
});

afterAll(async () => {
  await teardownTestDb();
});

describe('findLEIByBIC', () => {
  it('returns LEI for exact 11-char BIC match', async () => {
    const result = await findLEIByBIC(db, 'NWBKGB2LXXX');
    expect(result).toBe('TEST123LEI');
  });

  it('returns LEI for 8-char BIC by trying XXX suffix', async () => {
    const result = await findLEIByBIC(db, 'NWBKGB2L');
    expect(result).toBe('TEST123LEI');
  });

  it('returns null for unmatched BIC', async () => {
    const result = await findLEIByBIC(db, 'XXXXUS33XXX');
    expect(result).toBeNull();
  });

  it('handles case-insensitive input', async () => {
    const result = await findLEIByBIC(db, 'nwbkgb2lxxx');
    expect(result).toBe('TEST123LEI');
  });

  it('returns LEI for 11-char BIC ending XXX by falling back to 8-char match', async () => {
    const result = await findLEIByBIC(db, 'DEUTDEFFXXX');
    expect(result).toBe('DEUT_LEI');
  });

  it('returns null for completely unknown 8-char BIC', async () => {
    const result = await findLEIByBIC(db, 'ZZZZZZ99');
    expect(result).toBeNull();
  });

  it('handles whitespace in input', async () => {
    const result = await findLEIByBIC(db, '  NWBKGB2LXXX  ');
    expect(result).toBe('TEST123LEI');
  });
});
