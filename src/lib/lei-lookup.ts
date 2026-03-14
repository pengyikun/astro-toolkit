import type { Knex } from 'knex';

// ── Types ──────────────────────────────────────────────────────────────────

export interface LEIAddress {
  addressLines: string[];
  city: string;
  region: string;
  country: string;
  postalCode: string;
}

export interface LEIEntity {
  lei: string;
  legalName: string;
  status: string;
  jurisdiction: string;
  category: string;
  legalAddress: LEIAddress;
  headquartersAddress: LEIAddress;
  registrationStatus: string;
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
    return {
      lei: attrs.lei,
      legalName: entity?.legalName?.name || '',
      status: entity?.status || '',
      jurisdiction: entity?.jurisdiction || '',
      category: entity?.category || '',
      legalAddress: parseAddress(entity?.legalAddress),
      headquartersAddress: parseAddress(entity?.headquartersAddress),
      registrationStatus: attrs.registration?.status || '',
    };
  } catch {
    // Network error, timeout, parse error — return null gracefully
    return null;
  }
}
