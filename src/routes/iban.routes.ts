import { Router } from 'express';
import type { Request, Response } from 'express';
import { parseIBAN } from '../lib/iban';

export default function ibanRoutes(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.render('iban/index', { title: 'IBAN Checker', result: null, input: '' });
  });

  router.post('/check', (req: Request, res: Response) => {
    const input = String(req.body.iban || '');
    const result = parseIBAN(input);
    res.render('iban/index', { title: 'IBAN Checker', result, input });
  });

  return router;
}
