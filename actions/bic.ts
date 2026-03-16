'use server';

import { parseBIC } from '@/lib/bic';
import { findLEIByBIC, fetchLEIRecord } from '@/lib/lei-lookup';
import type { LEIEntity } from '@/lib/lei-lookup';
import type { BICParseResult } from '@/types';
import db from '@/lib/db';

export interface BICCheckResult {
  result: BICParseResult;
  input: string;
  leiEntity: LEIEntity | null;
}

export async function checkBIC(formData: FormData): Promise<BICCheckResult> {
  const input = String(formData.get('bic') || '');
  const result = parseBIC(input);

  let leiEntity: LEIEntity | null = null;

  if (result.valid && result.bic) {
    const lei = await findLEIByBIC(db, result.bic);
    if (lei) {
      leiEntity = await fetchLEIRecord(lei);
    }
  }

  return { result, input, leiEntity };
}
