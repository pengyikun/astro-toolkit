import { describe, it, expect } from 'vitest';
import { validateIBAN, parseIBAN } from '../../lib/iban';

describe('IBAN Validator & Parser', () => {
  // ── validateIBAN ────────────────────────────────────────────────────────

  describe('validateIBAN', () => {
    describe('valid IBANs', () => {
      const validIBANs = [
        { iban: 'GB29NWBK60161331926819', country: 'GB' },
        { iban: 'DE89370400440532013000', country: 'DE' },
        { iban: 'FR7630006000011234567890189', country: 'FR' },
        { iban: 'ES9121000418450200051332', country: 'ES' },
        { iban: 'IT60X0542811101000000123456', country: 'IT' },
        { iban: 'NL91ABNA0417164300', country: 'NL' },
        { iban: 'BE68539007547034', country: 'BE' },
        { iban: 'AT611904300234573201', country: 'AT' },
        { iban: 'CH9300762011623852957', country: 'CH' },
        { iban: 'PT50000201231234567890154', country: 'PT' },
        { iban: 'NO9386011117947', country: 'NO' },
        { iban: 'SE4550000000058398257466', country: 'SE' },
      ];

      validIBANs.forEach(({ iban, country }) => {
        it(`should validate ${country} IBAN: ${iban}`, () => {
          const result = validateIBAN(iban);
          expect(result.valid).toBe(true);
          expect(result.error).toBeUndefined();
        });
      });
    });

    describe('invalid IBANs', () => {
      it('should reject IBAN with wrong length for country', () => {
        // GB requires 22, this is 20
        const result = validateIBAN('GB29NWBK601613319268');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Wrong length for country GB');
        expect(result.error).toContain('expected 22');
        expect(result.error).toContain('got 20');
      });

      it('should reject IBAN with bad check digits', () => {
        const result = validateIBAN('GB00NWBK60161331926819');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid check digits');
      });

      it('should reject IBAN with unknown country code', () => {
        const result = validateIBAN('XX1234567890123456');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Unknown country code');
        expect(result.error).toContain('XX');
      });

      it('should reject empty string', () => {
        const result = validateIBAN('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too short');
      });

      it('should reject null', () => {
        const result = validateIBAN(null);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('IBAN is required');
      });

      it('should reject undefined', () => {
        const result = validateIBAN(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('IBAN is required');
      });

      it('should reject IBAN shorter than 15 characters', () => {
        const result = validateIBAN('GB29NWBK6016');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too short');
      });

      it('should reject IBAN longer than 34 characters', () => {
        const result = validateIBAN('GB29NWBK60161331926819000000000000000');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('too long');
      });

      it('should reject IBAN with invalid BBAN format', () => {
        // GB BBAN must be 4 letters + 14 digits; use letters where digits expected
        const result = validateIBAN('GB29NWBK6016133192ABCD');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid BBAN format');
      });
    });

    describe('edge cases', () => {
      it('should accept lowercase input', () => {
        const result = validateIBAN('gb29nwbk60161331926819');
        expect(result.valid).toBe(true);
      });

      it('should accept input with spaces', () => {
        const result = validateIBAN('GB29 NWBK 6016 1331 9268 19');
        expect(result.valid).toBe(true);
      });

      it('should accept mixed case with spaces', () => {
        const result = validateIBAN('gb29 NWBK 6016 1331 9268 19');
        expect(result.valid).toBe(true);
      });

      it('should handle input with leading/trailing spaces', () => {
        const result = validateIBAN('  GB29NWBK60161331926819  ');
        expect(result.valid).toBe(true);
      });

      it('should handle input with multiple consecutive spaces', () => {
        const result = validateIBAN('GB29  NWBK  60161331926819');
        expect(result.valid).toBe(true);
      });
    });
  });

  // ── parseIBAN ───────────────────────────────────────────────────────────

  describe('parseIBAN', () => {
    describe('GB IBAN parsing', () => {
      it('should correctly parse GB IBAN components', () => {
        const result = parseIBAN('GB29NWBK60161331926819');
        expect(result.valid).toBe(true);
        expect(result.iban).toBe('GB29NWBK60161331926819');
        expect(result.country_code).toBe('GB');
        expect(result.country_name).toBe('United Kingdom');
        expect(result.check_digits).toBe('29');
        expect(result.bban).toBe('NWBK60161331926819');
        expect(result.bank_identifier).toBe('NWBK');
        expect(result.branch_identifier).toBe('601613');
        expect(result.account_number).toBe('31926819');
      });
    });

    describe('DE IBAN parsing', () => {
      it('should correctly parse DE IBAN components', () => {
        const result = parseIBAN('DE89370400440532013000');
        expect(result.valid).toBe(true);
        expect(result.iban).toBe('DE89370400440532013000');
        expect(result.country_code).toBe('DE');
        expect(result.country_name).toBe('Germany');
        expect(result.check_digits).toBe('89');
        expect(result.bban).toBe('370400440532013000');
        expect(result.bank_identifier).toBe('37040044');
        expect(result.branch_identifier).toBeNull();
        expect(result.account_number).toBe('0532013000');
      });
    });

    describe('FR IBAN parsing', () => {
      it('should correctly parse FR IBAN components', () => {
        const result = parseIBAN('FR7630006000011234567890189');
        expect(result.valid).toBe(true);
        expect(result.country_code).toBe('FR');
        expect(result.country_name).toBe('France');
        expect(result.check_digits).toBe('76');
        expect(result.bban).toBe('30006000011234567890189');
        expect(result.bank_identifier).toBe('30006');
        expect(result.branch_identifier).toBe('00001');
        expect(result.account_number).toBe('12345678901');
      });
    });

    describe('NL IBAN parsing', () => {
      it('should correctly parse NL IBAN components', () => {
        const result = parseIBAN('NL91ABNA0417164300');
        expect(result.valid).toBe(true);
        expect(result.country_code).toBe('NL');
        expect(result.country_name).toBe('Netherlands');
        expect(result.check_digits).toBe('91');
        expect(result.bban).toBe('ABNA0417164300');
        expect(result.bank_identifier).toBe('ABNA');
        expect(result.branch_identifier).toBeNull();
        expect(result.account_number).toBe('0417164300');
      });
    });

    describe('ES IBAN parsing', () => {
      it('should correctly parse ES IBAN components', () => {
        const result = parseIBAN('ES9121000418450200051332');
        expect(result.valid).toBe(true);
        expect(result.country_code).toBe('ES');
        expect(result.country_name).toBe('Spain');
        expect(result.check_digits).toBe('91');
        expect(result.bban).toBe('21000418450200051332');
        expect(result.bank_identifier).toBe('2100');
        expect(result.branch_identifier).toBe('0418');
        expect(result.account_number).toBe('450200051332');
      });
    });

    describe('formatted IBAN output', () => {
      it('should format IBAN in groups of 4', () => {
        const result = parseIBAN('GB29NWBK60161331926819');
        expect(result.iban_formatted).toBe('GB29 NWBK 6016 1331 9268 19');
      });

      it('should format DE IBAN in groups of 4', () => {
        const result = parseIBAN('DE89370400440532013000');
        expect(result.iban_formatted).toBe('DE89 3704 0044 0532 0130 00');
      });

      it('should format NL IBAN in groups of 4', () => {
        const result = parseIBAN('NL91ABNA0417164300');
        expect(result.iban_formatted).toBe('NL91 ABNA 0417 1643 00');
      });
    });

    describe('invalid input returns validation errors', () => {
      it('should return validation error for invalid IBAN', () => {
        const result = parseIBAN('INVALID');
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.iban).toBeUndefined();
      });

      it('should return validation error for null', () => {
        const result = parseIBAN(null);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('IBAN is required');
      });

      it('should return validation error for undefined', () => {
        const result = parseIBAN(undefined);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('IBAN is required');
      });
    });

    describe('edge cases for parsing', () => {
      it('should parse lowercase input correctly', () => {
        const result = parseIBAN('gb29nwbk60161331926819');
        expect(result.valid).toBe(true);
        expect(result.iban).toBe('GB29NWBK60161331926819');
        expect(result.bank_identifier).toBe('NWBK');
      });

      it('should parse input with spaces correctly', () => {
        const result = parseIBAN('GB29 NWBK 6016 1331 9268 19');
        expect(result.valid).toBe(true);
        expect(result.iban).toBe('GB29NWBK60161331926819');
      });

      it('should return country name for known countries', () => {
        const result = parseIBAN('AT611904300234573201');
        expect(result.country_name).toBe('Austria');
      });

      it('should return null identifiers for country without decomposition', () => {
        // BR has no BBAN decomposition defined
        const result = parseIBAN('BR1500000000000010932840814P2');
        expect(result.valid).toBe(true);
        expect(result.bank_identifier).toBeNull();
        expect(result.branch_identifier).toBeNull();
        expect(result.account_number).toBeNull();
      });
    });
  });
});
