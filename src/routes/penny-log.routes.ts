import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Knex } from 'knex';
import * as PennyTestLogModel from '../models/penny-test-log.model';
import * as AccountModel from '../models/account.model';
import validate from '../middleware/validate';
import { pennyLogSchema } from '../schemas/penny-log.schema';
import type { ValidatedRequest } from '../types';

export default function pennyLogRoutes(db: Knex): Router {
  const router = Router();

  router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await PennyTestLogModel.findAll(db, req.query);
      res.render('penny-log/index', { title: 'Penny Test Log', ...result, filters: req.query });
    } catch (err) { next(err); }
  });

  router.get('/new', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const accountsResult = await AccountModel.findAll(db, { status: 'active', perPage: 1000 });
      res.render('penny-log/form', { title: 'New Penny Test Log', log: null, accounts: accountsResult.data, errors: null });
    } catch (err) { next(err); }
  });

  router.post('/', validate(pennyLogSchema), async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    if (req.validationErrors) {
      const accountsResult = await AccountModel.findAll(db, { status: 'active', perPage: 1000 });
      return res.status(422).render('penny-log/form', { title: 'New Penny Test Log', log: req.body, accounts: accountsResult.data, errors: req.validationErrors });
    }
    try {
      const log = await PennyTestLogModel.create(db, req.body);
      req.flash('success', 'Penny test log entry created.');
      res.redirect(`/penny-log/${log.id}`);
    } catch (err) { next(err); }
  });

  router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await PennyTestLogModel.findById(db, Number(req.params.id));
      if (!log) { return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Log entry not found', stack: null }); }
      let account = null;
      if (log.account_id) { account = await AccountModel.findById(db, log.account_id); }
      res.render('penny-log/show', { title: `Log #${log.id}`, log, account });
    } catch (err) { next(err); }
  });

  router.get('/:id/edit', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const log = await PennyTestLogModel.findById(db, Number(req.params.id));
      if (!log) { return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Log entry not found', stack: null }); }
      const accountsResult = await AccountModel.findAll(db, { status: 'active', perPage: 1000 });
      res.render('penny-log/form', { title: `Edit Log #${log.id}`, log, accounts: accountsResult.data, errors: null });
    } catch (err) { next(err); }
  });

  router.put('/:id', validate(pennyLogSchema), async (req: ValidatedRequest, res: Response, next: NextFunction) => {
    if (req.validationErrors) {
      const accountsResult = await AccountModel.findAll(db, { status: 'active', perPage: 1000 });
      return res.status(422).render('penny-log/form', { title: 'Edit Penny Test Log', log: { ...req.body, id: req.params.id }, accounts: accountsResult.data, errors: req.validationErrors });
    }
    try {
      const log = await PennyTestLogModel.update(db, Number(req.params.id), req.body);
      if (!log) { return res.status(404).render('error', { title: 'Not Found', status: 404, message: 'Log entry not found', stack: null }); }
      req.flash('success', 'Penny test log entry updated.');
      res.redirect(`/penny-log/${log.id}`);
    } catch (err) { next(err); }
  });

  router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
      await PennyTestLogModel.remove(db, Number(req.params.id));
      req.flash('success', 'Penny test log entry deleted.');
      res.redirect('/penny-log');
    } catch (err) { next(err); }
  });

  return router;
}
