import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { parseJson } from '../lib/json-parser';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export default function jsonParserRoutes(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.render('json-parser/index', { title: 'Smart JSON Parser', input: '', result: null });
  });

  router.post('/parse', upload.single('file'), (req: Request, res: Response) => {
    let input = '';
    if (req.file) {
      input = req.file.buffer.toString('utf-8');
    } else if (req.body.input) {
      input = req.body.input;
    }

    const result = parseJson(input);
    res.render('json-parser/index', { title: 'Smart JSON Parser', input, result });
  });

  router.post('/api/parse', upload.single('file'), (req: Request, res: Response) => {
    let input = '';
    if (req.file) {
      input = req.file.buffer.toString('utf-8');
    } else if (req.body.input) {
      input = req.body.input;
    }

    const result = parseJson(input);
    res.json(result);
  });

  return router;
}
