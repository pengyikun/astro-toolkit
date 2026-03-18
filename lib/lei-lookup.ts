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

function parseAddress(raw: Record<string, unknown> | undefined): LEIAddress {
  return {
    addressLines: Array.isArray(raw?.addressLines) ? raw.addressLines as string[] : [],
    city: (raw?.city as string) || '',
    region: (raw?.region as string) || '',
    country: (raw?.country as string) || '',
    postalCode: (raw?.postalCode as string) || '',
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

    const json = await res.json() as Record<string, unknown>;
    const data = json?.data as Record<string, unknown> | undefined;
    const attrs = data?.attributes as Record<string, unknown> | undefined;
    if (!attrs) return null;

    const entity = attrs?.entity as Record<string, unknown> | undefined;
    const reg = attrs?.registration as Record<string, unknown> | undefined;

    const otherNames: string[] = [];
    if (Array.isArray(entity?.otherNames)) {
      for (const n of entity.otherNames as Record<string, unknown>[]) {
        if (n?.name) otherNames.push(n.name as string);
      }
    }
    if (Array.isArray(entity?.transliteratedOtherNames)) {
      for (const n of entity.transliteratedOtherNames as Record<string, unknown>[]) {
        if (n?.name) otherNames.push(n.name as string);
      }
    }

    const legalName = entity?.legalName as Record<string, unknown> | undefined;
    const legalForm = entity?.legalForm as Record<string, unknown> | undefined;
    const registeredAt = entity?.registeredAt as Record<string, unknown> | undefined;

    return {
      lei: attrs.lei as string,
      legalName: (legalName?.name as string) || '',
      otherNames,
      status: (entity?.status as string) || '',
      jurisdiction: (entity?.jurisdiction as string) || '',
      category: (entity?.category as string) || '',
      legalForm: {
        id: (legalForm?.id as string) || '',
        other: (legalForm?.other as string) || '',
      },
      registeredAt: (registeredAt?.id as string) || '',
      registeredAs: (entity?.registeredAs as string) || '',
      creationDate: (entity?.creationDate as string) || '',
      expirationDate: (entity?.expirationDate as string) || '',
      expirationReason: (entity?.expirationReason as string) || '',
      legalAddress: parseAddress(entity?.legalAddress as Record<string, unknown> | undefined),
      headquartersAddress: parseAddress(entity?.headquartersAddress as Record<string, unknown> | undefined),
      registration: {
        status: (reg?.status as string) || '',
        initialRegistrationDate: (reg?.initialRegistrationDate as string) || '',
        lastUpdateDate: (reg?.lastUpdateDate as string) || '',
        nextRenewalDate: (reg?.nextRenewalDate as string) || '',
        managingLou: (reg?.managingLou as string) || '',
        corroborationLevel: (reg?.corroborationLevel as string) || '',
      },
    };
  } catch {
    // Network error, timeout, parse error — return null gracefully
    return null;
  }
}
