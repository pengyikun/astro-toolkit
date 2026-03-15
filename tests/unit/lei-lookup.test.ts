process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '../helpers/setup';
import { findLEIByBIC, fetchLEIRecord } from '../../src/lib/lei-lookup';
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

describe('fetchLEIRecord', () => {
  it('returns null for invalid/nonexistent LEI', async () => {
    const result = await fetchLEIRecord('INVALID_LEI_000000');
    expect(result).toBeNull();
  });

  it('returns null when network error occurs', async () => {
    // The function catches all errors internally and returns null
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.reject(new Error('Network error'));
    try {
      const result = await fetchLEIRecord('529900T8BM49AURSDO55');
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns null when response is not ok', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => Promise.resolve({ ok: false } as Response);
    try {
      const result = await fetchLEIRecord('529900T8BM49AURSDO55');
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('returns null when response JSON has no data.attributes', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: {} }),
      } as Response);
    try {
      const result = await fetchLEIRecord('529900T8BM49AURSDO55');
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('parses a valid GLEIF response', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              attributes: {
                lei: '529900T8BM49AURSDO55',
                entity: {
                  legalName: { name: 'Test Corp' },
                  otherNames: [{ name: 'Alt Name' }],
                  status: 'ACTIVE',
                  jurisdiction: 'GB',
                  category: 'GENERAL',
                  legalForm: { id: 'ELF1', other: '' },
                  registeredAt: { id: 'RA000123' },
                  registeredAs: 'REG001',
                  creationDate: '2020-01-01',
                  legalAddress: {
                    addressLines: ['123 Test St'],
                    city: 'London',
                    region: 'England',
                    country: 'GB',
                    postalCode: 'EC1A 1BB',
                  },
                  headquartersAddress: null,
                },
                registration: {
                  status: 'ISSUED',
                  initialRegistrationDate: '2020-01-01',
                  lastUpdateDate: '2024-01-01',
                  nextRenewalDate: '2025-01-01',
                  managingLou: 'LOU001',
                  corroborationLevel: 'FULLY_CORROBORATED',
                },
              },
            },
          }),
      } as Response);
    try {
      const result = await fetchLEIRecord('529900T8BM49AURSDO55');
      expect(result).not.toBeNull();
      expect(result!.lei).toBe('529900T8BM49AURSDO55');
      expect(result!.legalName).toBe('Test Corp');
      expect(result!.otherNames).toContain('Alt Name');
      expect(result!.status).toBe('ACTIVE');
      expect(result!.jurisdiction).toBe('GB');
      expect(result!.legalForm.id).toBe('ELF1');
      expect(result!.legalAddress.city).toBe('London');
      expect(result!.headquartersAddress.addressLines).toEqual([]);
      expect(result!.registration.status).toBe('ISSUED');
      expect(result!.registration.managingLou).toBe('LOU001');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
