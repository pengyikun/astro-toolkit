import { Router } from 'express';
import type { Request, Response } from 'express';
import { parseBIC } from '../lib/bic';

export default function bicRoutes(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.render('bic/index', { title: 'BIC/SWIFT Checker', result: null, input: '' });
  });

  router.post('/check', (req: Request, res: Response) => {
    const input = String(req.body.bic || '');
    const result = parseBIC(input);
    res.render('bic/index', { title: 'BIC/SWIFT Checker', result, input });
  });

  return router;
}
