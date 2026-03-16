import { describe, it, expect } from 'vitest';
import { parseBIC, validateBIC } from '../../lib/bic';

describe('BIC Route Logic', () => {
  describe('POST /api/bic/validate', () => {
    it('returns JSON for valid 8-char BIC', () => {
      const result = parseBIC('NWBKGB2L');
      expect(result.valid).toBe(true);
      expect(result.institution_code).toBe('NWBK');
      expect(result.country_code).toBe('GB');
      expect(result.location_code).toBe('2L');
      expect(result.branch_code).toBeNull();
      expect(result.is_primary_office).toBe(true);
    });

    it('returns JSON for valid 11-char BIC', () => {
      const result = parseBIC('DEUTDEFF500');
      expect(result.valid).toBe(true);
      expect(result.institution_code).toBe('DEUT');
      expect(result.country_code).toBe('DE');
      expect(result.branch_code).toBe('500');
      expect(result.is_primary_office).toBe(false);
    });

    it('detects test BIC', () => {
      const result = parseBIC('NWBKGB20');
      expect(result.valid).toBe(true);
      expect(result.is_test_bic).toBe(true);
    });

    it('returns JSON for invalid BIC', () => {
      const result = parseBIC('12345');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('handles empty input', () => {
      const result = validateBIC('');
      expect(result.valid).toBe(false);
    });
  });
});
