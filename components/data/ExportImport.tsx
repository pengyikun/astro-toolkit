'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { exportData, importData, type ImportResult } from '@/actions/data';
import { useLocale } from '@/lib/i18n/client';
import { CheckCircleIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileUploadTrigger } from '@/components/ui/file-upload-trigger';

export default function ExportImport() {
  const { t } = useLocale();
  const [exportModules, setExportModules] = useState<Record<string, boolean>>({
    accounts: false,
    credentials: false,
    penny_test_logs: false,
  });
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, startExportTransition] = useTransition();

  const [importModules, setImportModules] = useState<Record<string, boolean>>({
    import_accounts: false,
    import_credentials: false,
    import_penny_test_logs: false,
  });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, startImportTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportToggle = useCallback((key: string) => {
    setExportModules((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleImportToggle = useCallback((key: string) => {
    setImportModules((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    setExportError(null);

    const modules = Object.entries(exportModules)
      .filter(([, checked]) => checked)
      .map(([key]) => key);

    if (modules.length === 0) {
      setExportError(t('data.selectAtLeastOne'));
      return;
    }

    startExportTransition(async () => {
      const result = await exportData(modules);
      if (!result.success) {
        setExportError(result.error ?? 'Export failed');
        return;
      }

      const json = JSON.stringify(result.data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `fintech-toolkit-export-${new Date().toISOString().slice(0, 10)}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImportFile(file);
    setImportResult(null);
    setImportError(null);
  };

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);
    setImportResult(null);

    if (!importFile) {
      setImportError(t('data.selectFile'));
      return;
    }

    startImportTransition(async () => {
      const formData = new FormData();
      formData.set('file', importFile);
      if (importModules.import_accounts) formData.set('import_accounts', '1');
      if (importModules.import_credentials) formData.set('import_credentials', '1');
      if (importModules.import_penny_test_logs) formData.set('import_penny_test_logs', '1');

      const result = await importData(formData);
      if (!result.success) {
        setImportError(result.error ?? 'Import failed');
      } else {
        setImportResult(result);
        setImportFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };

  return (
    <>
      {importResult?.success && importResult.summary && (
        <div className="console-notice success">
          <p className="console-notice-title">
            <CheckCircleIcon className="mr-1 inline-block h-4 w-4 -mt-0.5" />
            {t('data.importComplete')}
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>{importResult.summary.accounts} {t('data.accountsImported')}</li>
            <li>{importResult.summary.credentials} {t('data.credentialSetsImported')}</li>
            <li>{importResult.summary.penny_test_logs} {t('data.transactionsImported')}</li>
          </ul>
        </div>
      )}

      <section className="section-block">
        <div className="section-head">
          <h2 className="console-section-title">{t('data.dataManagement')}</h2>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardContent className="flex h-full flex-col gap-6 p-5 sm:p-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">{t('data.exportData')}</h3>
              <p className="text-sm leading-6 text-ink-secondary">{t('data.exportDescription')}</p>
            </div>

            <form onSubmit={handleExport} className="flex flex-col flex-1">
              <div className="space-y-3 rounded-lg border border-border bg-page/40 p-4 mb-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportModules.accounts}
                    onChange={() => handleExportToggle('accounts')}
                    className="rounded border-input-border text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-ink">{t('data.accounts')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportModules.credentials}
                    onChange={() => handleExportToggle('credentials')}
                    className="rounded border-input-border text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-ink">{t('data.credentialsVault')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportModules.penny_test_logs}
                    onChange={() => handleExportToggle('penny_test_logs')}
                    className="rounded border-input-border text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-ink">{t('data.testTransactions')}</span>
                </label>
              </div>

              {exportError && (
                <div className="console-notice danger mb-4">
                  {exportError}
                </div>
              )}

              <div className="console-notice warning mb-5">
                <p className="text-sm leading-6">
                  <svg className="mr-1 inline-block h-3.5 w-3.5 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                  {t('data.exportWarning')}
                </p>
              </div>

              <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  disabled={isExporting}
                  className={`sm:w-auto ${isExporting ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isExporting ? t('data.exporting') : t('data.exportSelected')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex h-full flex-col gap-6 p-5 sm:p-6">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">{t('data.importData')}</h3>
              <p className="text-sm leading-6 text-ink-secondary">{t('data.importDescription')}</p>
            </div>

            <form onSubmit={handleImport} className="flex flex-col flex-1">
              <div className="mb-5">
                <label htmlFor="import-file" className="mb-2 block text-sm font-medium text-ink">{t('data.jsonFilesOnly')}</label>
                <FileUploadTrigger
                  id="import-file"
                  ref={fileInputRef}
                  accept=".json"
                  onChange={handleFileChange}
                  fileName={importFile?.name}
                  actionLabel={t('vault.clickToUpload')}
                  promptLabel={t('vault.dragAndDrop')}
                  helperText={t('data.jsonFilesOnly')}
                />
              </div>

              <div className="space-y-3 rounded-lg border border-border bg-page/40 p-4 mb-5">
                <p className="console-inline-label">{t('data.importModulesHint')}</p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importModules.import_accounts}
                    onChange={() => handleImportToggle('import_accounts')}
                    className="rounded border-input-border text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-ink">{t('data.accounts')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importModules.import_credentials}
                    onChange={() => handleImportToggle('import_credentials')}
                    className="rounded border-input-border text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-ink">{t('data.credentialsVault')}</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={importModules.import_penny_test_logs}
                    onChange={() => handleImportToggle('import_penny_test_logs')}
                    className="rounded border-input-border text-brand focus:ring-brand"
                  />
                  <span className="text-sm text-ink">{t('data.testTransactions')}</span>
                </label>
              </div>

              {importError && (
                <div className="console-notice danger mb-4">
                  {importError}
                </div>
              )}

              <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={isImporting}
                  className={`sm:w-auto ${isImporting ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isImporting ? t('data.importing') : t('data.importBtn')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
