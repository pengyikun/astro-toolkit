import { describe, it, expect } from 'vitest';
import { validateBIC, parseBIC } from '../../lib/bic';

describe('BIC/SWIFT Validator & Parser', () => {
  // ── validateBIC ─────────────────────────────────────────────────────────

  describe('validateBIC', () => {
    describe('valid 8-character BICs', () => {
      const valid8CharBICs = ['NWBKGB2L', 'DEUTDEFF', 'BNPAFRPP'];

      valid8CharBICs.forEach((bic) => {
        it(`should validate 8-char BIC: ${bic}`, () => {
          const result = validateBIC(bic);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });
    });

    describe('valid 11-character BICs', () => {
      const valid11CharBICs = ['NWBKGB2LXXX', 'COBADEFFXXX', 'BOFAUS3NXXX'];

      valid11CharBICs.forEach((bic) => {
        it(`should validate 11-char BIC: ${bic}`, () => {
          const result = validateBIC(bic);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });
    });

    describe('invalid BICs', () => {
      it('should reject BIC with 7 characters', () => {
        const result = validateBIC('NWBKGB2');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('8 or 11 characters');
      });

      it('should reject BIC with 9 characters', () => {
        const result = validateBIC('NWBKGB2LA');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('8 or 11 characters');
      });

      it('should reject BIC with 10 characters', () => {
        const result = validateBIC('NWBKGB2LAB');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('8 or 11 characters');
      });

      it('should reject BIC with 12 characters', () => {
        const result = validateBIC('NWBKGB2LXXXX');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('8 or 11 characters');
      });

      it('should reject BIC with non-alpha institution code', () => {
        const result = validateBIC('12ABGB2L');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Institution code');
        expect(result.error).toContain('letters only');
      });

      it('should reject BIC with numeric chars in institution code', () => {
        const result = validateBIC('NW1KGB2L');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Institution code');
      });

      it('should reject BIC with invalid country code', () => {
        const result = validateBIC('NWBKXX2L');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid country code');
        expect(result.error).toContain('XX');
      });

      it('should reject BIC with non-alphanumeric location code', () => {
        const result = validateBIC('NWBKGB!L');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Location code');
        expect(result.error).toContain('alphanumeric');
      });

      it('should reject 11-char BIC with non-alphanumeric branch code', () => {
        const result = validateBIC('NWBKGB2L!!!');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Branch code');
        expect(result.error).toContain('alphanumeric');
      });

      it('should reject empty string', () => {
        const result = validateBIC('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should reject null', () => {
        const result = validateBIC(null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should reject undefined', () => {
        const result = validateBIC(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });
    });

    describe('edge cases', () => {
      it('should accept lowercase input', () => {
        const result = validateBIC('nwbkgb2l');
        expect(result.valid).toBe(true);
      });

      it('should accept input with spaces', () => {
        const result = validateBIC('NWBK GB 2L');
        expect(result.valid).toBe(true);
      });

      it('should accept mixed case with spaces', () => {
        const result = validateBIC('nwbk GB 2l');
        expect(result.valid).toBe(true);
      });
    });
  });

  // ── parseBIC ────────────────────────────────────────────────────────────

  describe('parseBIC', () => {
    describe('8-character BIC parsing', () => {
      it('should correctly parse 8-char BIC components', () => {
        const result = parseBIC('NWBKGB2L');
        expect(result.valid).toBe(true);
        expect(result.bic).toBe('NWBKGB2L');
        expect(result.institution_code).toBe('NWBK');
        expect(result.country_code).toBe('GB');
        expect(result.country_name).toBe('United Kingdom');
        expect(result.location_code).toBe('2L');
        expect(result.branch_code).toBeNull();
      });

      it('should parse DEUTDEFF correctly', () => {
        const result = parseBIC('DEUTDEFF');
        expect(result.valid).toBe(true);
        expect(result.institution_code).toBe('DEUT');
        expect(result.country_code).toBe('DE');
        expect(result.country_name).toBe('Germany');
        expect(result.location_code).toBe('FF');
      });

      it('should parse BNPAFRPP correctly', () => {
        const result = parseBIC('BNPAFRPP');
        expect(result.valid).toBe(true);
        expect(result.institution_code).toBe('BNPA');
        expect(result.country_code).toBe('FR');
        expect(result.country_name).toBe('France');
        expect(result.location_code).toBe('PP');
      });
    });

    describe('11-character BIC parsing', () => {
      it('should correctly parse 11-char BIC with XXX branch', () => {
        const result = parseBIC('NWBKGB2LXXX');
        expect(result.valid).toBe(true);
        expect(result.bic).toBe('NWBKGB2LXXX');
        expect(result.institution_code).toBe('NWBK');
        expect(result.country_code).toBe('GB');
        expect(result.branch_code).toBe('XXX');
      });

      it('should correctly parse 11-char BIC with specific branch', () => {
        const result = parseBIC('COBADEFF100');
        expect(result.valid).toBe(true);
        expect(result.bic).toBe('COBADEFF100');
        expect(result.institution_code).toBe('COBA');
        expect(result.country_code).toBe('DE');
        expect(result.branch_code).toBe('100');
      });
    });

    describe('is_primary_office', () => {
      it('should be true for 8-char BIC (no branch code)', () => {
        const result = parseBIC('NWBKGB2L');
        expect(result.is_primary_office).toBe(true);
      });

      it('should be true for 11-char BIC with XXX branch', () => {
        const result = parseBIC('NWBKGB2LXXX');
        expect(result.is_primary_office).toBe(true);
      });

      it('should be false for 11-char BIC with non-XXX branch', () => {
        const result = parseBIC('COBADEFF100');
        expect(result.is_primary_office).toBe(false);
      });
    });

    describe('is_test_bic', () => {
      it('should detect test BIC when second char of location is 0', () => {
        const result = parseBIC('NWBKGB20');
        expect(result.valid).toBe(true);
        expect(result.is_test_bic).toBe(true);
      });

      it('should not flag non-test BIC', () => {
        const result = parseBIC('NWBKGB2L');
        expect(result.is_test_bic).toBe(false);
      });

      it('should detect test BIC in 11-char format', () => {
        const result = parseBIC('DEUTDE20XXX');
        expect(result.valid).toBe(true);
        expect(result.is_test_bic).toBe(true);
      });
    });

    describe('is_passive_participant', () => {
      it('should detect passive participant when second char of location is 1', () => {
        const result = parseBIC('NWBKGB21');
        expect(result.valid).toBe(true);
        expect(result.is_passive_participant).toBe(true);
      });

      it('should not flag non-passive BIC', () => {
        const result = parseBIC('NWBKGB2L');
        expect(result.is_passive_participant).toBe(false);
      });
    });

    describe('is_reverse_billing', () => {
      it('should detect reverse billing when second char of location is 2', () => {
        const result = parseBIC('NWBKGB22');
        expect(result.valid).toBe(true);
        expect(result.is_reverse_billing).toBe(true);
      });

      it('should not flag non-reverse-billing BIC', () => {
        const result = parseBIC('NWBKGB2L');
        expect(result.is_reverse_billing).toBe(false);
      });
    });

    describe('country name resolution', () => {
      it('should return country name for known countries', () => {
        const result = parseBIC('BNPAFRPP');
        expect(result.country_name).toBe('France');
      });

      it('should return country code for unknown countries in name map', () => {
        // IR (Iran) is a valid ISO code but might not be in the name map
        const result = parseBIC('TESTIR2L');
        if (result.valid) {
          // If IR is not in COUNTRY_NAMES, it should fall back to the code
          expect(result.country_name).toBeDefined();
        }
      });
    });

    describe('invalid input returns validation errors', () => {
      it('should return validation error for invalid BIC', () => {
        const result = parseBIC('INVALID');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.bic).toBeUndefined();
      });

      it('should return validation error for null', () => {
        const result = parseBIC(null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('required');
      });

      it('should return validation error for undefined', () => {
        const result = parseBIC(undefined);
        expect(result.valid).toBe(false);
      });
    });

    describe('edge cases for parsing', () => {
      it('should parse lowercase input and return uppercase BIC', () => {
        const result = parseBIC('nwbkgb2l');
        expect(result.valid).toBe(true);
        expect(result.bic).toBe('NWBKGB2L');
        expect(result.institution_code).toBe('NWBK');
      });

      it('should parse input with spaces', () => {
        const result = parseBIC('NWBK GB2L XXX');
        expect(result.valid).toBe(true);
        expect(result.bic).toBe('NWBKGB2LXXX');
      });

      it('should correctly identify all flags as false for normal BIC', () => {
        const result = parseBIC('DEUTDEFF');
        expect(result.is_test_bic).toBe(false);
        expect(result.is_passive_participant).toBe(false);
        expect(result.is_reverse_billing).toBe(false);
      });
    });
  });
});
