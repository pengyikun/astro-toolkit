import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Knex } from 'knex';
import { parseBIC } from '../lib/bic';
import { findLEIByBIC, fetchLEIRecord } from '../lib/lei-lookup';
import type { LEIEntity } from '../lib/lei-lookup';

export default function bicRoutes(db: Knex): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.render('bic/index', { title: 'BIC/SWIFT Checker', result: null, input: '', leiEntity: null });
  });

  router.post('/check', async (req: Request, res: Response) => {
    const input = String(req.body.bic || '');
    const result = parseBIC(input);

    let leiEntity: LEIEntity | null = null;

    if (result.valid && result.bic) {
      const lei = await findLEIByBIC(db, result.bic);
      if (lei) {
        leiEntity = await fetchLEIRecord(lei);
      }
    }

    res.render('bic/index', { title: 'BIC/SWIFT Checker', result, input, leiEntity });
  });

  return router;
}
