import { Router } from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { parseXml } from '../lib/xml-parser';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

export default function xmlParserRoutes(): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.render('xml-parser/index', { title: 'Smart XML Parser', input: '', result: null });
  });

  router.post('/parse', upload.single('file'), (req: Request, res: Response) => {
    let input = '';
    if (req.file) {
      input = req.file.buffer.toString('utf-8');
    } else if (req.body.input) {
      input = req.body.input;
    }

    if (input.length > 2 * 1024 * 1024) {
      return res.status(413).render('xml-parser/index', {
        title: 'Smart XML Parser', input: '', result: { error: 'Input too large. Maximum 2MB allowed.' }
      });
    }

    const result = parseXml(input);
    res.render('xml-parser/index', { title: 'Smart XML Parser', input, result });
  });

  router.post('/api/parse', upload.single('file'), (req: Request, res: Response) => {
    let input = '';
    if (req.file) {
      input = req.file.buffer.toString('utf-8');
    } else if (req.body.input) {
      input = req.body.input;
    }

    if (input.length > 2 * 1024 * 1024) {
      return res.status(413).json({ error: 'Input too large. Maximum 2MB allowed.' });
    }

    const result = parseXml(input);
    res.json(result);
  });

  return router;
}
