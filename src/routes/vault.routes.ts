import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Knex } from 'knex';
import * as CredentialModel from '../models/credential.model';
import validate from '../middleware/validate';
import { credentialSchema } from '../schemas/credential.schema';
import upload from '../middleware/upload';
import type { ValidatedRequest, CredentialItem } from '../types';

export default function vaultRoutes(db: Knex): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await CredentialModel.findAll(db, req.query);
      res.render('vault/index', { title: 'Credentials Vault', ...result, filters: req.query });
    } catch (err) { next(err); }
  });

  router.get('/new', (_req: Request, res: Response) => {
    res.render('vault/form', { title: 'Add Credential Set', credential: null, errors: null });
  });

  router.post('/', upload.single('cert_file'), validate(credentialSchema), async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    if (req.validationErrors) {
      return res.status(422).render('vault/form', { title: 'Add Credential Set', credential: req.body, errors: req.validationErrors });
    }
    try {
      const items = parseItemsFromBody(req.body, req.file);
      const credential = await CredentialModel.create(db, { ...req.body, items });
      req.flash('success', `Credential set "${credential.label}" created.`);
      res.redirect(`/vault/${credential.id}`);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credential = await CredentialModel.findById(db, Number(req.params.id));
      if (!credential) { return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Credential set not found', stack: null }); }
      res.render('vault/show', { title: credential.label, credential });
    } catch (err) { next(err); }
  });

  router.get('/:id/edit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credential = await CredentialModel.findById(db, Number(req.params.id));
      if (!credential) { return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Credential set not found', stack: null }); }
      res.render('vault/form', { title: `Edit ${credential.label}`, credential, errors: null });
    } catch (err) { next(err); }
  });

  router.put('/:id', upload.single('cert_file'), validate(credentialSchema), async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    if (req.validationErrors) {
      return res.status(422).render('vault/form', { title: 'Edit Credential Set', credential: { ...req.body, id: req.params.id }, errors: req.validationErrors });
    }
    try {
      const items = parseItemsFromBody(req.body, req.file);
      const credential = await CredentialModel.update(db, Number(req.params.id), { ...req.body, items });
      if (!credential) { return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Credential set not found', stack: null }); }
      req.flash('success', `Credential set "${credential.label}" updated.`);
      res.redirect(`/vault/${credential.id}`);
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await CredentialModel.remove(db, Number(req.params.id));
      req.flash('success', 'Credential set deleted.');
      res.redirect('/vault');
    } catch (err) { next(err); }
  });

  return router;
}

function parseItemsFromBody(body: Record<string, unknown>, file?: Express.Multer.File): Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'>[] {
  const items: Omit<CredentialItem, 'id' | 'credential_id' | 'created_at'>[] = [];
  const keys = body.item_key;
  if (keys) {
    const itemKeys = Array.isArray(keys) ? keys : [keys];
    const itemValues = Array.isArray(body.item_value) ? body.item_value : [body.item_value];
    for (let i = 0; i < itemKeys.length; i++) {
      if (itemKeys[i]) {
        items.push({ item_key: String(itemKeys[i]), item_value: String(itemValues[i] || ''), item_type: 'text', file_name: null, file_path: null });
      }
    }
  }
  if (file) {
    items.push({ item_key: String(body.cert_key || 'certificate'), item_value: '', item_type: 'file', file_name: file.originalname, file_path: file.path });
  }
  return items;
}
