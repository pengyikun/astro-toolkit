import type { IBANValidationResult, IBANParseResult } from '@/types';

const COUNTRY_LENGTHS: Record<string, number> = {
  AL: 28, AD: 24, AT: 20, AZ: 28, BH: 22, BY: 28, BE: 16, BA: 20, BR: 29, BG: 22,
  CR: 22, HR: 21, CY: 28, CZ: 24, DK: 18, DO: 28, EG: 29, EE: 20, FO: 18, FI: 18,
  FR: 27, GE: 22, DE: 22, GI: 23, GR: 27, GL: 18, GT: 28, HU: 28, IS: 26, IQ: 23,
  IE: 22, IL: 23, IT: 27, JO: 30, KZ: 20, XK: 20, KW: 30, LV: 21, LB: 28, LY: 25,
  LI: 21, LT: 20, LU: 20, MT: 31, MR: 27, MU: 30, MC: 27, MD: 24, ME: 22, NL: 18,
  MK: 19, NO: 15, PK: 24, PS: 29, PL: 28, PT: 25, QA: 29, RO: 24, LC: 32, SM: 27,
  SA: 24, RS: 22, SC: 31, SK: 24, SI: 19, ES: 24, SE: 24, CH: 21, TL: 23, TN: 24,
  TR: 26, UA: 29, AE: 23, GB: 22, VA: 22, VG: 24,
};

const COUNTRY_NAMES: Record<string, string> = {
  AL: 'Albania', AD: 'Andorra', AT: 'Austria', AZ: 'Azerbaijan', BH: 'Bahrain',
  BY: 'Belarus', BE: 'Belgium', BA: 'Bosnia and Herzegovina', BR: 'Brazil', BG: 'Bulgaria',
  CR: 'Costa Rica', HR: 'Croatia', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark',
  DO: 'Dominican Republic', EG: 'Egypt', EE: 'Estonia', FO: 'Faroe Islands', FI: 'Finland',
  FR: 'France', GE: 'Georgia', DE: 'Germany', GI: 'Gibraltar', GR: 'Greece',
  GL: 'Greenland', GT: 'Guatemala', HU: 'Hungary', IS: 'Iceland', IQ: 'Iraq',
  IE: 'Ireland', IL: 'Israel', IT: 'Italy', JO: 'Jordan', KZ: 'Kazakhstan',
  XK: 'Kosovo', KW: 'Kuwait', LV: 'Latvia', LB: 'Lebanon', LY: 'Libya',
  LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MT: 'Malta', MR: 'Mauritania',
  MU: 'Mauritius', MC: 'Monaco', MD: 'Moldova', ME: 'Montenegro', NL: 'Netherlands',
  MK: 'North Macedonia', NO: 'Norway', PK: 'Pakistan', PS: 'Palestine', PL: 'Poland',
  PT: 'Portugal', QA: 'Qatar', RO: 'Romania', LC: 'Saint Lucia', SM: 'San Marino',
  SA: 'Saudi Arabia', RS: 'Serbia', SC: 'Seychelles', SK: 'Slovakia', SI: 'Slovenia',
  ES: 'Spain', SE: 'Sweden', CH: 'Switzerland', TL: 'East Timor', TN: 'Tunisia',
  TR: 'Turkey', UA: 'Ukraine', AE: 'United Arab Emirates', GB: 'United Kingdom',
  VA: 'Vatican City', VG: 'British Virgin Islands',
};

const BBAN_FORMATS: Record<string, RegExp> = {
  AL: /^\d{8}[A-Z0-9]{16}$/,
  AD: /^\d{8}[A-Z0-9]{12}$/,
  AT: /^\d{16}$/,
  AZ: /^[A-Z]{4}[A-Z0-9]{20}$/,
  BH: /^[A-Z]{4}[A-Z0-9]{14}$/,
  BY: /^[A-Z0-9]{4}\d{4}[A-Z0-9]{16}$/,
  BE: /^\d{12}$/,
  BA: /^\d{16}$/,
  BR: /^\d{23}[A-Z]{1}[A-Z0-9]{1}$/,
  BG: /^[A-Z]{4}\d{6}[A-Z0-9]{8}$/,
  CR: /^0\d{17}$/,
  HR: /^\d{17}$/,
  CY: /^\d{8}[A-Z0-9]{16}$/,
  CZ: /^\d{20}$/,
  DK: /^\d{14}$/,
  DO: /^[A-Z0-9]{4}\d{20}$/,
  EG: /^\d{25}$/,
  EE: /^\d{16}$/,
  FO: /^\d{14}$/,
  FI: /^\d{14}$/,
  FR: /^\d{10}[A-Z0-9]{11}\d{2}$/,
  GE: /^[A-Z]{2}\d{16}$/,
  DE: /^\d{18}$/,
  GI: /^[A-Z]{4}[A-Z0-9]{15}$/,
  GR: /^\d{7}[A-Z0-9]{16}$/,
  GL: /^\d{14}$/,
  GT: /^[A-Z0-9]{24}$/,
  HU: /^\d{24}$/,
  IS: /^\d{22}$/,
  IQ: /^[A-Z]{4}\d{15}$/,
  IE: /^[A-Z]{4}\d{14}$/,
  IL: /^\d{19}$/,
  IT: /^[A-Z]\d{10}[A-Z0-9]{12}$/,
  JO: /^[A-Z]{4}\d{4}[A-Z0-9]{18}$/,
  KZ: /^\d{3}[A-Z0-9]{13}$/,
  XK: /^\d{16}$/,
  KW: /^[A-Z]{4}[A-Z0-9]{22}$/,
  LV: /^[A-Z]{4}[A-Z0-9]{13}$/,
  LB: /^\d{4}[A-Z0-9]{20}$/,
  LY: /^\d{21}$/,
  LI: /^\d{5}[A-Z0-9]{12}$/,
  LT: /^\d{16}$/,
  LU: /^\d{3}[A-Z0-9]{13}$/,
  MT: /^[A-Z]{4}\d{5}[A-Z0-9]{18}$/,
  MR: /^\d{23}$/,
  MU: /^[A-Z]{4}\d{19}[A-Z]{3}$/,
  MC: /^\d{10}[A-Z0-9]{11}\d{2}$/,
  MD: /^[A-Z0-9]{2}[A-Z0-9]{18}$/,
  ME: /^\d{18}$/,
  NL: /^[A-Z]{4}\d{10}$/,
  MK: /^\d{3}[A-Z0-9]{10}\d{2}$/,
  NO: /^\d{11}$/,
  PK: /^[A-Z]{4}[A-Z0-9]{16}$/,
  PS: /^[A-Z]{4}[A-Z0-9]{21}$/,
  PL: /^\d{24}$/,
  PT: /^\d{21}$/,
  QA: /^[A-Z]{4}[A-Z0-9]{21}$/,
  RO: /^[A-Z]{4}[A-Z0-9]{16}$/,
  LC: /^[A-Z]{4}[A-Z0-9]{24}$/,
  SM: /^[A-Z]\d{10}[A-Z0-9]{12}$/,
  SA: /^\d{2}[A-Z0-9]{18}$/,
  RS: /^\d{18}$/,
  SC: /^[A-Z]{4}\d{20}[A-Z]{3}$/,
  SK: /^\d{20}$/,
  SI: /^\d{15}$/,
  ES: /^\d{20}$/,
  SE: /^\d{20}$/,
  CH: /^\d{5}[A-Z0-9]{12}$/,
  TL: /^\d{19}$/,
  TN: /^\d{20}$/,
  TR: /^\d{5}[A-Z0-9]{17}$/,
  UA: /^\d{6}[A-Z0-9]{19}$/,
  AE: /^\d{19}$/,
  GB: /^[A-Z]{4}\d{14}$/,
  VA: /^\d{18}$/,
  VG: /^[A-Z]{4}\d{16}$/,
};

interface BBANDecomposition {
  bankStart: number;
  bankEnd: number;
  branchStart?: number;
  branchEnd?: number;
  accountStart: number;
  accountEnd: number;
}

const BBAN_DECOMPOSITION: Record<string, BBANDecomposition> = {
  GB: { bankStart: 0, bankEnd: 4, branchStart: 4, branchEnd: 10, accountStart: 10, accountEnd: 18 },
  DE: { bankStart: 0, bankEnd: 8, accountStart: 8, accountEnd: 18 },
  FR: { bankStart: 0, bankEnd: 5, branchStart: 5, branchEnd: 10, accountStart: 10, accountEnd: 21 },
  ES: { bankStart: 0, bankEnd: 4, branchStart: 4, branchEnd: 8, accountStart: 8, accountEnd: 20 },
  IT: { bankStart: 1, bankEnd: 6, branchStart: 6, branchEnd: 11, accountStart: 11, accountEnd: 23 },
  NL: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 14 },
  BE: { bankStart: 0, bankEnd: 3, accountStart: 3, accountEnd: 10 },
  AT: { bankStart: 0, bankEnd: 5, accountStart: 5, accountEnd: 16 },
  CH: { bankStart: 0, bankEnd: 5, accountStart: 5, accountEnd: 17 },
  PT: { bankStart: 0, bankEnd: 4, branchStart: 4, branchEnd: 8, accountStart: 8, accountEnd: 19 },
  IE: { bankStart: 0, bankEnd: 4, branchStart: 4, branchEnd: 10, accountStart: 10, accountEnd: 18 },
  PL: { bankStart: 0, bankEnd: 8, accountStart: 8, accountEnd: 24 },
  SE: { bankStart: 0, bankEnd: 3, accountStart: 3, accountEnd: 20 },
  NO: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 11 },
  DK: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 14 },
  FI: { bankStart: 0, bankEnd: 3, accountStart: 3, accountEnd: 14 },
  CZ: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 20 },
  RO: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 20 },
  HU: { bankStart: 0, bankEnd: 3, branchStart: 3, branchEnd: 7, accountStart: 7, accountEnd: 23 },
  BG: { bankStart: 0, bankEnd: 4, branchStart: 4, branchEnd: 8, accountStart: 8, accountEnd: 18 },
  HR: { bankStart: 0, bankEnd: 7, accountStart: 7, accountEnd: 17 },
  LT: { bankStart: 0, bankEnd: 5, accountStart: 5, accountEnd: 16 },
  LV: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 17 },
  EE: { bankStart: 0, bankEnd: 2, accountStart: 2, accountEnd: 16 },
  SI: { bankStart: 0, bankEnd: 5, accountStart: 5, accountEnd: 15 },
  SK: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 20 },
  LU: { bankStart: 0, bankEnd: 3, accountStart: 3, accountEnd: 16 },
  MT: { bankStart: 0, bankEnd: 4, branchStart: 4, branchEnd: 9, accountStart: 9, accountEnd: 27 },
  CY: { bankStart: 0, bankEnd: 3, branchStart: 3, branchEnd: 8, accountStart: 8, accountEnd: 24 },
  GR: { bankStart: 0, bankEnd: 3, branchStart: 3, branchEnd: 7, accountStart: 7, accountEnd: 23 },
  TR: { bankStart: 0, bankEnd: 5, accountStart: 5, accountEnd: 22 },
  SA: { bankStart: 0, bankEnd: 2, accountStart: 2, accountEnd: 20 },
  AE: { bankStart: 0, bankEnd: 3, accountStart: 3, accountEnd: 19 },
  QA: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 25 },
  BH: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 18 },
  KW: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 26 },
  JO: { bankStart: 0, bankEnd: 4, branchStart: 4, branchEnd: 8, accountStart: 8, accountEnd: 26 },
  LB: { bankStart: 0, bankEnd: 4, accountStart: 4, accountEnd: 24 },
  IL: { bankStart: 0, bankEnd: 3, branchStart: 3, branchEnd: 6, accountStart: 6, accountEnd: 19 },
  MU: { bankStart: 0, bankEnd: 4, branchStart: 4, branchEnd: 8, accountStart: 8, accountEnd: 24 },
  TN: { bankStart: 0, bankEnd: 2, branchStart: 2, branchEnd: 5, accountStart: 5, accountEnd: 20 },
};

function mod97(digits: string): number {
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) {
    const chunk = String(remainder) + digits.slice(i, i + 7);
    remainder = parseInt(chunk, 10) % 97;
  }
  return remainder;
}

function ibanToDigitString(iban: string): string {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let digits = '';
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      digits += (code - 55).toString();
    } else {
      digits += ch;
    }
  }
  return digits;
}

function formatIBAN(iban: string): string {
  return iban.replace(/(.{4})/g, '$1 ').trim();
}

export function validateIBAN(input: string | null | undefined): IBANValidationResult {
  if (input == null || typeof input !== 'string') {
    return { valid: false, error: 'IBAN is required' };
  }

  const iban = input.replace(/\s+/g, '').toUpperCase();

  if (iban.length < 15) {
    return { valid: false, error: 'IBAN is too short (minimum 15 characters)' };
  }
  if (iban.length > 34) {
    return { valid: false, error: 'IBAN is too long (maximum 34 characters)' };
  }

  const countryCode = iban.slice(0, 2);

  if (!(countryCode in COUNTRY_LENGTHS)) {
    return { valid: false, error: `Unknown country code "${countryCode}"` };
  }

  const expectedLength = COUNTRY_LENGTHS[countryCode];
  if (iban.length !== expectedLength) {
    return {
      valid: false,
      error: `Wrong length for country ${countryCode} — expected ${expectedLength}, got ${iban.length}`,
    };
  }

  const bban = iban.slice(4);
  const bbanFormat = BBAN_FORMATS[countryCode];
  if (bbanFormat && !bbanFormat.test(bban)) {
    return { valid: false, error: `Invalid BBAN format for country ${countryCode}` };
  }

  const digitString = ibanToDigitString(iban);
  if (mod97(digitString) !== 1) {
    return { valid: false, error: 'Invalid check digits' };
  }

  return { valid: true };
}

export function parseIBAN(input: string | null | undefined): IBANParseResult {
  const validation = validateIBAN(input);
  if (!validation.valid) {
    return validation;
  }

  const iban = input!.replace(/\s+/g, '').toUpperCase();
  const countryCode = iban.slice(0, 2);
  const checkDigits = iban.slice(2, 4);
  const bban = iban.slice(4);

  let bankIdentifier: string | null = null;
  let branchIdentifier: string | null = null;
  let accountNumber: string | null = null;

  const decomp = BBAN_DECOMPOSITION[countryCode];
  if (decomp) {
    bankIdentifier = bban.slice(decomp.bankStart, decomp.bankEnd);
    if (decomp.branchStart !== undefined && decomp.branchEnd !== undefined) {
      branchIdentifier = bban.slice(decomp.branchStart, decomp.branchEnd);
    }
    accountNumber = bban.slice(decomp.accountStart, decomp.accountEnd);
  }

  return {
    valid: true,
    iban,
    country_code: countryCode,
    country_name: COUNTRY_NAMES[countryCode] ?? countryCode,
    check_digits: checkDigits,
    bban,
    bank_identifier: bankIdentifier,
    branch_identifier: branchIdentifier,
    account_number: accountNumber,
    iban_formatted: formatIBAN(iban),
  };
}
