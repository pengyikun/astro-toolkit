'use client';

import { useState, useTransition, useRef, useCallback } from 'react';
import { exportData, importData, type ImportResult } from '@/actions/data';
import { useLocale } from '@/lib/i18n/client';

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
        <div className="px-4 py-4 rounded-lg bg-success-light border border-success-border text-success text-sm">
          <p className="font-medium mb-2">
            <svg className="w-4 h-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        {/* Export Panel */}
        <div className="console-panel">
          <div className="console-panel-body flex flex-col h-full">
            <h3 className="text-sm font-semibold text-ink mb-1">{t('data.exportData')}</h3>
            <p className="text-[13px] text-ink-secondary mb-5">{t('data.exportDescription')}</p>

            <form onSubmit={handleExport} className="flex flex-col flex-1">
              <div className="space-y-3 mb-5">
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
                <div className="mb-4 px-3 py-2 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
                  {exportError}
                </div>
              )}

              <div className="bg-warning-light border border-warning-border rounded-md px-4 py-3 mb-5">
                <p className="text-xs text-warning">
                  <svg className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
                  {t('data.exportWarning')}
                </p>
              </div>

              <div className="mt-auto">
                <button
                  type="submit"
                  disabled={isExporting}
                  className={`console-button-primary ${isExporting ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isExporting ? t('data.exporting') : t('data.exportSelected')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Import Panel */}
        <div className="console-panel">
          <div className="console-panel-body flex flex-col h-full">
            <h3 className="text-sm font-semibold text-ink mb-1">{t('data.importData')}</h3>
            <p className="text-[13px] text-ink-secondary mb-5">{t('data.importDescription')}</p>

            <form onSubmit={handleImport} className="flex flex-col flex-1">
              <div className="mb-5">
                <label htmlFor="import-file" className="block text-sm font-medium text-ink mb-2">{t('data.jsonFilesOnly')}</label>
                <label htmlFor="import-file" className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-input-border rounded-lg cursor-pointer hover:border-brand hover:bg-page transition-colors">
                  <div className="flex flex-col items-center justify-center py-4">
                    <svg className="w-7 h-7 text-ink-muted mb-1.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg>
                    {importFile ? (
                      <p className="text-sm text-ink">{importFile.name}</p>
                    ) : (
                      <>
                        <p className="text-sm text-ink-secondary"><span className="font-medium text-brand">{t('vault.clickToUpload')}</span> {t('vault.dragAndDrop')}</p>
                        <p className="text-xs text-ink-muted mt-0.5">{t('data.jsonFilesOnly')}</p>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    id="import-file"
                    ref={fileInputRef}
                    accept=".json"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-3 mb-5">
                <p className="text-[11px] font-medium text-ink-secondary uppercase tracking-wider">{t('data.importModulesHint')}</p>
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
                <div className="mb-4 px-3 py-2 rounded-md bg-danger/10 border border-danger/20 text-danger text-sm">
                  {importError}
                </div>
              )}

              <div className="mt-auto">
                <button
                  type="submit"
                  disabled={isImporting}
                  className={`console-button-secondary ${isImporting ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isImporting ? t('data.importing') : t('data.importBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}