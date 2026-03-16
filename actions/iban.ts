'use server';

import { parseIBAN } from '@/lib/iban';
import { ibanSupportsBICLookup, findLEIByIBAN, fetchLEIRecord } from '@/lib/lei-lookup';
import type { LEIEntity } from '@/lib/lei-lookup';
import type { IBANParseResult } from '@/types';
import db from '@/lib/db';

export interface IBANCheckResult {
  result: IBANParseResult;
  input: string;
  leiEntity: LEIEntity | null;
  leiSupported: boolean;
}

export async function checkIBAN(formData: FormData): Promise<IBANCheckResult> {
  const input = String(formData.get('iban') || '');
  const result = parseIBAN(input);

  let leiEntity: LEIEntity | null = null;
  let leiSupported = false;

  if (result.valid && result.country_code && result.bank_identifier) {
    leiSupported = ibanSupportsBICLookup(result.country_code);
    if (leiSupported) {
      const lei = await findLEIByIBAN(db, result.country_code, result.bank_identifier);
      if (lei) {
        leiEntity = await fetchLEIRecord(lei);
      }
    }
  }

  return { result, input, leiEntity, leiSupported };
}
