import type { Knex } from 'knex';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LEIAddress {
  addressLines: string[];
  city: string;
  region: string;
  country: string;
  postalCode: string;
}

export interface LEIRegistration {
  status: string;
  initialRegistrationDate: string;
  lastUpdateDate: string;
  nextRenewalDate: string;
  managingLou: string;
  corroborationLevel: string;
}

export interface LEILegalForm {
  id: string;
  other: string;
}

export interface LEIEntity {
  lei: string;
  legalName: string;
  otherNames: string[];
  status: string;
  jurisdiction: string;
  category: string;
  legalForm: LEILegalForm;
  registeredAt: string;
  registeredAs: string;
  creationDate: string;
  expirationDate: string;
  expirationReason: string;
  legalAddress: LEIAddress;
  headquartersAddress: LEIAddress;
  registration: LEIRegistration;
}

// ── BIC → LEI mapping (from database) ──────────────────────────────────────

export async function findLEIByBIC(db: Knex, bic: string): Promise<string | null> {
  const normalized = bic.toUpperCase().trim();

  // Try exact match first (11-char BIC)
  const exact = await db('bic_lei_mappings').where('bic', normalized).first();
  if (exact) return exact.lei;

  // If 8-char BIC, try with XXX suffix (primary office)
  if (normalized.length === 8) {
    const withXxx = await db('bic_lei_mappings').where('bic', normalized + 'XXX').first();
    if (withXxx) return withXxx.lei;
  }

  // If 11-char BIC ending in XXX, try without suffix
  if (normalized.length === 11 && normalized.endsWith('XXX')) {
    const without = await db('bic_lei_mappings').where('bic', normalized.substring(0, 8)).first();
    if (without) return without.lei;
  }

  return null;
}

// ── IBAN → LEI lookup (quick-win: countries where BBAN bank code = BIC institution code) ──

// Countries where the first 4 chars of the BBAN are the BIC institution code (all alpha)
const IBAN_DIRECT_BIC_COUNTRIES = new Set([
  'GB', 'NL', 'IE', 'LV', 'BG', 'RO', 'QA', 'BH', 'KW', 'JO', 'MU', 'MT',
]);

export function ibanSupportsBICLookup(countryCode: string): boolean {
  return IBAN_DIRECT_BIC_COUNTRIES.has(countryCode.toUpperCase());
}

export async function findLEIByIBAN(
  db: Knex,
  countryCode: string,
  bankIdentifier: string,
): Promise<string | null> {
  const cc = countryCode.toUpperCase();
  const bank = bankIdentifier.toUpperCase();

  if (!IBAN_DIRECT_BIC_COUNTRIES.has(cc)) return null;
  if (!/^[A-Z]{4}$/.test(bank)) return null;

  // The BIC pattern is: <4-letter institution><2-letter country><2-char location>[3-char branch]
  // Search for BICs starting with <bank><country> in bic_lei_mappings
  const row = await db('bic_lei_mappings')
    .where('bic', 'like', `${bank}${cc}%`)
    .first();

  return row ? row.lei : null;
}

// ── GLEIF API fetch ────────────────────────────────────────────────────────

const GLEIF_BASE = 'https://api.gleif.org/api/v1/lei-records';
const FETCH_TIMEOUT_MS = 8000;

function parseAddress(raw: any): LEIAddress {
  return {
    addressLines: Array.isArray(raw?.addressLines) ? raw.addressLines : [],
    city: raw?.city || '',
    region: raw?.region || '',
    country: raw?.country || '',
    postalCode: raw?.postalCode || '',
  };
}

export async function fetchLEIRecord(lei: string): Promise<LEIEntity | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(`${GLEIF_BASE}/${encodeURIComponent(lei)}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const json = await res.json() as any;
    const attrs = json?.data?.attributes;
    if (!attrs) return null;

    const entity = attrs.entity;
    const reg = attrs.registration;

    const otherNames: string[] = [];
    if (Array.isArray(entity?.otherNames)) {
      for (const n of entity.otherNames) {
        if (n?.name) otherNames.push(n.name);
      }
    }
    if (Array.isArray(entity?.transliteratedOtherNames)) {
      for (const n of entity.transliteratedOtherNames) {
        if (n?.name) otherNames.push(n.name);
      }
    }

    return {
      lei: attrs.lei,
      legalName: entity?.legalName?.name || '',
      otherNames,
      status: entity?.status || '',
      jurisdiction: entity?.jurisdiction || '',
      category: entity?.category || '',
      legalForm: {
        id: entity?.legalForm?.id || '',
        other: entity?.legalForm?.other || '',
      },
      registeredAt: entity?.registeredAt?.id || '',
      registeredAs: entity?.registeredAs || '',
      creationDate: entity?.creationDate || '',
      expirationDate: entity?.expirationDate || '',
      expirationReason: entity?.expirationReason || '',
      legalAddress: parseAddress(entity?.legalAddress),
      headquartersAddress: parseAddress(entity?.headquartersAddress),
      registration: {
        status: reg?.status || '',
        initialRegistrationDate: reg?.initialRegistrationDate || '',
        lastUpdateDate: reg?.lastUpdateDate || '',
        nextRenewalDate: reg?.nextRenewalDate || '',
        managingLou: reg?.managingLou || '',
        corroborationLevel: reg?.corroborationLevel || '',
      },
    };
  } catch {
    // Network error, timeout, parse error — return null gracefully
    return null;
  }
}
