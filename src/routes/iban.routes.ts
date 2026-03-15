import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Knex } from 'knex';
import { parseIBAN } from '../lib/iban';
import { ibanSupportsBICLookup, findLEIByIBAN, fetchLEIRecord } from '../lib/lei-lookup';
import type { LEIEntity } from '../lib/lei-lookup';

export default function ibanRoutes(db: Knex): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.render('iban/index', {
      title: 'IBAN Checker',
      result: null,
      input: '',
      leiEntity: null,
      leiSupported: false,
    });
  });

  router.post('/check', async (req: Request, res: Response) => {
    const input = String(req.body.iban || '');
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

    res.render('iban/index', { title: 'IBAN Checker', result, input, leiEntity, leiSupported });
  });

  return router;
}
