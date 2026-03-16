import { describe, it, expect } from 'vitest';
import { parseIBAN, validateIBAN } from '../../lib/iban';

describe('IBAN Route Logic', () => {
  describe('POST /api/iban/validate', () => {
    it('returns validation result for valid IBAN', () => {
      const result = parseIBAN('GB29NWBK60161331926819');
      expect(result.valid).toBe(true);
      expect(result.country_code).toBe('GB');
      expect(result.check_digits).toBe('29');
      expect(result.bban).toBe('NWBK60161331926819');
    });

    it('returns validation result for invalid IBAN', () => {
      const result = parseIBAN('XX99INVALID');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('validates a German IBAN', () => {
      const result = parseIBAN('DE89370400440532013000');
      expect(result.valid).toBe(true);
      expect(result.country_code).toBe('DE');
    });

    it('validates a French IBAN', () => {
      const result = parseIBAN('FR7630006000011234567890189');
      expect(result.valid).toBe(true);
      expect(result.country_code).toBe('FR');
    });

    it('handles empty input', () => {
      const result = validateIBAN('');
      expect(result.valid).toBe(false);
    });
  });
});
