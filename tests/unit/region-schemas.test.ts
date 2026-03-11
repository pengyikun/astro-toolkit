import { describe, it, expect } from 'vitest';
import { REGION_SCHEMAS, getRegion, getAllRegions, getRegionFields } from '../../src/lib/region-schemas';

describe('Region Schemas', () => {
  const regionCodes = Object.keys(REGION_SCHEMAS);

  // ── Registry integrity ──────────────────────────────────────────────────

  describe('registry integrity', () => {
    it('should have at least 12 regions', () => {
      expect(regionCodes.length).toBeGreaterThanOrEqual(12);
    });

    regionCodes.forEach((code) => {
      describe(`region ${code} (${REGION_SCHEMAS[code].name})`, () => {
        it('should have a name', () => {
          expect(REGION_SCHEMAS[code].name).toBeDefined();
          expect(typeof REGION_SCHEMAS[code].name).toBe('string');
          expect(REGION_SCHEMAS[code].name.length).toBeGreaterThan(0);
        });

        it('should have a currency', () => {
          expect(REGION_SCHEMAS[code].currency).toBeDefined();
          expect(typeof REGION_SCHEMAS[code].currency).toBe('string');
          expect(REGION_SCHEMAS[code].currency.length).toBe(3);
        });

        it('should have at least one field', () => {
          expect(REGION_SCHEMAS[code].fields.length).toBeGreaterThan(0);
        });

        it('should have at least one required field', () => {
          const requiredFields = REGION_SCHEMAS[code].fields.filter((f) => f.required);
          expect(requiredFields.length).toBeGreaterThan(0);
        });

        it('should have a beneficiary_name field', () => {
          const beneficiaryField = REGION_SCHEMAS[code].fields.find(
            (f) => f.key === 'beneficiary_name'
          );
          expect(beneficiaryField).toBeDefined();
          expect(beneficiaryField!.required).toBe(true);
        });

        it('should have unique field keys', () => {
          const keys = REGION_SCHEMAS[code].fields.map((f) => f.key);
          const uniqueKeys = new Set(keys);
          expect(uniqueKeys.size).toBe(keys.length);
        });

        it('should have valid field types', () => {
          const validTypes = ['text', 'select', 'textarea'];
          REGION_SCHEMAS[code].fields.forEach((field) => {
            expect(validTypes).toContain(field.type);
          });
        });

        it('should have non-empty key and label for each field', () => {
          REGION_SCHEMAS[code].fields.forEach((field) => {
            expect(field.key).toBeDefined();
            expect(field.key.length).toBeGreaterThan(0);
            expect(field.label).toBeDefined();
            expect(field.label.length).toBeGreaterThan(0);
          });
        });

        it('should have snake_case keys', () => {
          REGION_SCHEMAS[code].fields.forEach((field) => {
            expect(field.key).toMatch(/^[a-z][a-z0-9_]*$/);
          });
        });

        it('should have options array for select-type fields', () => {
          const selectFields = REGION_SCHEMAS[code].fields.filter((f) => f.type === 'select');
          selectFields.forEach((field) => {
            expect(field.options).toBeDefined();
            expect(Array.isArray(field.options)).toBe(true);
            expect(field.options!.length).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  // ── Validation regex compilation ────────────────────────────────────────

  describe('validation regex compilation', () => {
    regionCodes.forEach((code) => {
      const fieldsWithValidation = REGION_SCHEMAS[code].fields.filter((f) => f.validation);

      fieldsWithValidation.forEach((field) => {
        it(`should compile regex for ${code}.${field.key}: ${field.validation}`, () => {
          expect(() => new RegExp(field.validation!)).not.toThrow();
        });
      });
    });
  });

  // ── getRegion ───────────────────────────────────────────────────────────

  describe('getRegion', () => {
    it('should return correct schema for known region code', () => {
      const result = getRegion('BR');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Brazil');
      expect(result!.currency).toBe('BRL');
      expect(result!.fields.length).toBeGreaterThan(0);
    });

    it('should return correct schema for US', () => {
      const result = getRegion('US');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('United States');
      expect(result!.currency).toBe('USD');
    });

    it('should return correct schema for GB', () => {
      const result = getRegion('GB');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('United Kingdom');
      expect(result!.currency).toBe('GBP');
    });

    it('should return correct schema for SEPA', () => {
      const result = getRegion('SEPA');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('SEPA Zone (EUR)');
      expect(result!.currency).toBe('EUR');
    });

    it('should return null for unknown region code', () => {
      const result = getRegion('ZZ');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = getRegion('');
      expect(result).toBeNull();
    });

    it('should be case-insensitive', () => {
      const result = getRegion('br');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('Brazil');
    });

    it('should handle mixed case input', () => {
      const result = getRegion('Gb');
      expect(result).not.toBeNull();
      expect(result!.name).toBe('United Kingdom');
    });
  });

  // ── getAllRegions ────────────────────────────────────────────────────────

  describe('getAllRegions', () => {
    it('should return an array', () => {
      const result = getAllRegions();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return at least 12 regions', () => {
      const result = getAllRegions();
      expect(result.length).toBeGreaterThanOrEqual(12);
    });

    it('should return objects with code, name, and currency', () => {
      const result = getAllRegions();
      result.forEach((region) => {
        expect(region).toHaveProperty('code');
        expect(region).toHaveProperty('name');
        expect(region).toHaveProperty('currency');
        expect(typeof region.code).toBe('string');
        expect(typeof region.name).toBe('string');
        expect(typeof region.currency).toBe('string');
      });
    });

    it('should not include fields in the summary', () => {
      const result = getAllRegions();
      result.forEach((region) => {
        expect(region).not.toHaveProperty('fields');
      });
    });

    it('should include known regions', () => {
      const result = getAllRegions();
      const codes = result.map((r) => r.code);
      expect(codes).toContain('BR');
      expect(codes).toContain('US');
      expect(codes).toContain('GB');
      expect(codes).toContain('MX');
      expect(codes).toContain('NG');
      expect(codes).toContain('SG');
      expect(codes).toContain('VN');
      expect(codes).toContain('SEPA');
      expect(codes).toContain('AU');
      expect(codes).toContain('NZ');
      expect(codes).toContain('IN');
      expect(codes).toContain('KE');
    });

    it('should have correct code-name mapping', () => {
      const result = getAllRegions();
      const brRegion = result.find((r) => r.code === 'BR');
      expect(brRegion).toBeDefined();
      expect(brRegion!.name).toBe('Brazil');
      expect(brRegion!.currency).toBe('BRL');
    });
  });

  // ── getRegionFields ─────────────────────────────────────────────────────

  describe('getRegionFields', () => {
    it('should return fields array for known region', () => {
      const result = getRegionFields('BR');
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should return correct fields for US region', () => {
      const result = getRegionFields('US');
      expect(result).not.toBeNull();
      const keys = result!.map((f) => f.key);
      expect(keys).toContain('aba_routing_number');
      expect(keys).toContain('account_number');
      expect(keys).toContain('beneficiary_name');
    });

    it('should return correct fields for GB region', () => {
      const result = getRegionFields('GB');
      expect(result).not.toBeNull();
      const keys = result!.map((f) => f.key);
      expect(keys).toContain('sort_code');
      expect(keys).toContain('account_number');
      expect(keys).toContain('beneficiary_name');
    });

    it('should return fields with correct structure', () => {
      const result = getRegionFields('BR');
      expect(result).not.toBeNull();
      result!.forEach((field) => {
        expect(field).toHaveProperty('key');
        expect(field).toHaveProperty('label');
        expect(field).toHaveProperty('type');
        expect(field).toHaveProperty('required');
        expect(typeof field.key).toBe('string');
        expect(typeof field.label).toBe('string');
        expect(typeof field.type).toBe('string');
        expect(typeof field.required).toBe('boolean');
      });
    });

    it('should return null for unknown region code', () => {
      const result = getRegionFields('ZZ');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = getRegionFields('');
      expect(result).toBeNull();
    });

    it('should be case-insensitive', () => {
      const result = getRegionFields('br');
      expect(result).not.toBeNull();
      expect(result!.length).toBeGreaterThan(0);
    });

    it('should return the same fields as the schema registry', () => {
      const fieldsViaFunction = getRegionFields('BR');
      const fieldsViaRegistry = REGION_SCHEMAS['BR'].fields;
      expect(fieldsViaFunction).toEqual(fieldsViaRegistry);
    });
  });

  // ── Specific region field checks ────────────────────────────────────────

  describe('specific region field details', () => {
    it('BR should have PIX-related fields', () => {
      const fields = getRegionFields('BR')!;
      const keys = fields.map((f) => f.key);
      expect(keys).toContain('pix_key');
      expect(keys).toContain('pix_key_type');
      expect(keys).toContain('cpf_cnpj');
    });

    it('US should have ABA routing number with validation regex', () => {
      const fields = getRegionFields('US')!;
      const abaField = fields.find((f) => f.key === 'aba_routing_number');
      expect(abaField).toBeDefined();
      expect(abaField!.required).toBe(true);
      expect(abaField!.validation).toBe('^\\d{9}$');
    });

    it('MX should have CLABE field', () => {
      const fields = getRegionFields('MX')!;
      const clabeField = fields.find((f) => f.key === 'clabe');
      expect(clabeField).toBeDefined();
      expect(clabeField!.required).toBe(true);
      expect(clabeField!.validation).toBe('^\\d{18}$');
    });

    it('IN should have IFSC code field', () => {
      const fields = getRegionFields('IN')!;
      const ifscField = fields.find((f) => f.key === 'ifsc_code');
      expect(ifscField).toBeDefined();
      expect(ifscField!.required).toBe(true);
      expect(ifscField!.validation).toBeDefined();
    });

    it('AU should have BSB code field', () => {
      const fields = getRegionFields('AU')!;
      const bsbField = fields.find((f) => f.key === 'bsb_code');
      expect(bsbField).toBeDefined();
      expect(bsbField!.required).toBe(true);
    });

    it('SG should have PayNow fields', () => {
      const fields = getRegionFields('SG')!;
      const keys = fields.map((f) => f.key);
      expect(keys).toContain('paynow_proxy_type');
      expect(keys).toContain('paynow_proxy_value');
    });

    it('KE should have M-Pesa field', () => {
      const fields = getRegionFields('KE')!;
      const mpesaField = fields.find((f) => f.key === 'mpesa_number');
      expect(mpesaField).toBeDefined();
      expect(mpesaField!.required).toBe(false);
    });
  });
});
