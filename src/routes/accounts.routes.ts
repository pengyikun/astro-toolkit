import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Knex } from 'knex';
import * as AccountModel from '../models/account.model';
import validate from '../middleware/validate';
import { accountSchema } from '../schemas/account.schema';
import { getAllRegions, getRegionFields } from '../lib/region-schemas';
import type { ValidatedRequest, AccountField } from '../types';

export default function accountsRoutes(db: Knex): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await AccountModel.findAll(db, req.query);
      res.render('accounts/index', { title: 'Accounts', ...result, filters: req.query, regions: getAllRegions() });
    } catch (err) { next(err); }
  });

  router.get('/new', (_req: Request, res: Response) => {
    res.render('accounts/form', { title: 'Create Account', account: null, regions: getAllRegions(), fields: [], errors: null });
  });

  router.post('/', validate(accountSchema), async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    if (req.validationErrors) {
      return res.status(422).render('accounts/form', {
        title: 'Create Account', account: req.body, regions: getAllRegions(), fields: [], errors: req.validationErrors,
      });
    }
    try {
      const fields = parseFieldsFromBody(req.body);
      const account = await AccountModel.create(db, { ...req.body, fields });
      req.flash('success', `Account "${account.name}" created.`);
      res.redirect(`/accounts/${account.id}`);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await AccountModel.findById(db, Number(req.params.id));
      if (!account) { return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Account not found', stack: null }); }
      res.render('accounts/show', { title: account.name, account });
    } catch (err) { next(err); }
  });

  router.get('/:id/edit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const account = await AccountModel.findById(db, Number(req.params.id));
      if (!account) { return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Account not found', stack: null }); }
      const regionFields = getRegionFields(account.region_code) || [];
      res.render('accounts/form', { title: `Edit ${account.name}`, account, regions: getAllRegions(), fields: regionFields, errors: null });
    } catch (err) { next(err); }
  });

  router.put('/:id', validate(accountSchema), async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    if (req.validationErrors) {
      return res.status(422).render('accounts/form', {
        title: 'Edit Account', account: { ...req.body, id: req.params.id }, regions: getAllRegions(), fields: [], errors: req.validationErrors,
      });
    }
    try {
      const fields = parseFieldsFromBody(req.body);
      const account = await AccountModel.update(db, Number(req.params.id), { ...req.body, fields });
      if (!account) { return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Account not found', stack: null }); }
      req.flash('success', `Account "${account.name}" updated.`);
      res.redirect(`/accounts/${account.id}`);
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await AccountModel.remove(db, Number(req.params.id));
      req.flash('success', 'Account archived.');
      res.redirect('/accounts');
    } catch (err) { next(err); }
  });

  return router;
}

function parseFieldsFromBody(body: Record<string, unknown>): Omit<AccountField, 'id' | 'account_id'>[] {
  const fields: Omit<AccountField, 'id' | 'account_id'>[] = [];
  const keys = body.field_key;
  if (!keys) return fields;

  const fieldKeys = Array.isArray(keys) ? keys : [keys];
  const fieldLabels = Array.isArray(body.field_label) ? body.field_label : [body.field_label];
  const fieldValues = Array.isArray(body.field_value) ? body.field_value : [body.field_value];
  const fieldTypes = Array.isArray(body.field_type) ? body.field_type : [body.field_type];
  const fieldCustom = Array.isArray(body.field_is_custom) ? body.field_is_custom : [body.field_is_custom];

  for (let i = 0; i < fieldKeys.length; i++) {
    if (fieldKeys[i]) {
      fields.push({
        field_key: String(fieldKeys[i]),
        field_label: String(fieldLabels[i] || fieldKeys[i]),
        field_value: String(fieldValues[i] || ''),
        field_type: (String(fieldTypes[i] || 'text')) as 'text' | 'select' | 'textarea',
        is_custom: fieldCustom[i] === '1' ? 1 : 0,
        sort_order: i,
      });
    }
  }
  return fields;
}
