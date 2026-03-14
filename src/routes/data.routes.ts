import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { Knex } from 'knex';
import multer from 'multer';
import { buildExportData, processImportData } from '../lib/export-import';
import config from '../config';
import { csrfProtection } from '../middleware/csrf';

const importUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export default function dataRoutes(db: Knex): Router {
  const router = Router();
  const settingsPath = '/settings';

  router.get('/', (_req: Request, res: Response) => {
    res.render('data/index', { title: 'Settings', importResult: null });
  });

  router.post('/export', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const modules: string[] = [];
      if (req.body.accounts) modules.push('accounts');
      if (req.body.credentials) modules.push('credentials');
      if (req.body.penny_test_logs) modules.push('penny_test_logs');

      if (modules.length === 0) {
        req.flash('error', 'Please select at least one module to export.');
        return res.redirect(settingsPath);
      }

      const data = await buildExportData(db, modules, config.vaultEncryptionKey);
      const filename = `fintech-toolkit-export-${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(data, null, 2));
    } catch (err) { next(err); }
  });

  router.post('/import', importUpload.single('file'), csrfProtection, async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        req.flash('error', 'Please select a file to import.');
        return res.redirect(settingsPath);
      }

      let jsonData;
      try {
        jsonData = JSON.parse(req.file.buffer.toString('utf8'));
      } catch {
        req.flash('error', 'Invalid JSON file.');
        return res.redirect(settingsPath);
      }

      const selectedModules: string[] = [];
      if (req.body.import_accounts) selectedModules.push('accounts');
      if (req.body.import_credentials) selectedModules.push('credentials');
      if (req.body.import_penny_test_logs) selectedModules.push('penny_test_logs');

      if (selectedModules.length === 0) {
        if (jsonData.accounts) selectedModules.push('accounts');
        if (jsonData.credentials) selectedModules.push('credentials');
        if (jsonData.penny_test_logs) selectedModules.push('penny_test_logs');
      }

      const summary = await processImportData(db, jsonData, selectedModules, config.vaultEncryptionKey);
      req.flash('success', `Import complete: ${summary.accounts} accounts, ${summary.credentials} credentials, ${summary.penny_test_logs} penny test logs.`);
      res.render('data/index', { title: 'Settings', importResult: summary });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Invalid import file')) {
        req.flash('error', err.message);
        return res.redirect(settingsPath);
      }
      next(err);
    }
  });

  return router;
}
