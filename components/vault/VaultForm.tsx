'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useLocale } from '@/lib/i18n/client';
import { createCredential, updateCredential } from '@/actions/vault';
import type { VaultActionResult } from '@/actions/vault';
import type { CredentialWithItems } from '@/types';

interface VaultFormProps {
  credential: CredentialWithItems | null;
}

interface ItemRow {
  clientId: string;
  key: string;
  value: string;
}

export default function VaultForm({ credential }: VaultFormProps) {
  const { t } = useLocale();
  const isEdit = !!(credential && credential.id);

  const initialItems: ItemRow[] = isEdit && credential.items
    ? credential.items
        .filter((item) => item.item_type === 'text')
        .map((item) => ({
          clientId: crypto.randomUUID(),
          key: item.item_key,
          value: '',
        }))
    : [{ clientId: crypto.randomUUID(), key: '', value: '' }];

  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const [errors, setErrors] = useState<Array<{ field: string; message: string }> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { clientId: crypto.randomUUID(), key: '', value: '' }]);
  }, []);

  const removeItem = useCallback((clientId: string) => {
    setItems((prev) => prev.filter((item) => item.clientId !== clientId));
  }, []);

  const updateItem = useCallback((clientId: string, field: 'key' | 'value', val: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.clientId === clientId ? { ...item, [field]: val } : item
      )
    );
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setSelectedFileName(file ? file.name : '');
  }, []);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setErrors(null);

    let result: VaultActionResult;
    if (isEdit) {
      result = await updateCredential(credential.id, formData);
    } else {
      result = await createCredential(formData);
    }

    if (!result.success && result.errors) {
      setErrors(result.errors);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link href="/vault" className="inline-flex items-center gap-1 text-caption text-ink-secondary hover:text-ink transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          {t('vault.credentialVault')}
        </Link>
      </div>

      <h2 className="text-xl font-semibold text-ink mb-6">
        {isEdit ? t('vault.editCredentialSet') : t('vault.addCredentialSet')}
      </h2>

      {errors && (
        <div role="alert" className="mb-6 px-4 py-3 rounded-lg bg-danger-light border border-danger-border text-danger text-sm">
          <p className="font-medium mb-1">{t('vault.fixErrors')}</p>
          <ul className="list-disc list-inside">
            {errors.map((err, idx) => (
              <li key={idx}>{err.field ? `${err.field}: ` : ''}{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="console-panel">
          <div className="console-panel-body space-y-4">
            <h3 className="console-inline-label">{t('vault.credentialInfo')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="partner_name" className="console-label">
                  {t('vault.partnerName')} <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <input
                  type="text"
                  id="partner_name"
                  name="partner_name"
                  required
                  defaultValue={credential?.partner_name || ''}
                  placeholder={t('placeholder.partnerExample')}
                  className="console-input"
                />
              </div>
              <div>
                <label htmlFor="environment" className="console-label">
                  {t('common.environment')} <span className="text-danger" aria-hidden="true">*</span>
                </label>
                <select
                  id="environment"
                  name="environment"
                  required
                  defaultValue={credential?.environment || 'sandbox'}
                  className="console-select"
                >
                  <option value="sandbox">{t('vault.sandbox')}</option>
                  <option value="staging">{t('vault.staging')}</option>
                  <option value="uat">{t('vault.uat')}</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="label" className="console-label">
                {t('common.label')} <span className="text-danger" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                id="label"
                name="label"
                required
                defaultValue={credential?.label || ''}
                placeholder={t('placeholder.labelExample')}
                className="console-input"
              />
            </div>

            <div>
              <label htmlFor="notes" className="console-label">{t('common.notes')}</label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={credential?.notes || ''}
                placeholder={t('placeholder.notesExample')}
                className="console-textarea"
              />
            </div>
          </div>
        </div>

        <div className="console-panel">
          <div className="console-panel-body space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="console-inline-label">{t('vault.secretItems')}</h3>
              <button
                type="button"
                onClick={addItem}
                className="console-text-action inline-flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t('vault.addItem')}
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.clientId} className="flex gap-3 items-start vault-item-row">
                  <input
                    type="text"
                    name="item_key"
                    value={item.key}
                    onChange={(e) => updateItem(item.clientId, 'key', e.target.value)}
                    placeholder={t('vault.keyPlaceholder')}
                    className="console-input w-1/3"
                  />
                  <input
                    type="text"
                    name="item_value"
                    value={item.value}
                    onChange={(e) => updateItem(item.clientId, 'value', e.target.value)}
                    placeholder={isEdit ? t('vault.leaveBlankToKeep') : t('vault.valuePlaceholder')}
                    className="console-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(item.clientId)}
                    className="p-2 rounded-md text-ink-muted hover:text-danger hover:bg-danger-light transition-colors"
                    aria-label={t('common.remove')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="console-panel">
          <div className="console-panel-body space-y-4">
            <h3 className="console-inline-label">{t('vault.certificateUpload')}</h3>

            <div>
              <label htmlFor="cert_key" className="console-label">{t('vault.certKeyName')}</label>
              <p className="text-xs text-ink-muted mb-1.5">{t('vault.certIdentifyLabel')}</p>
              <input
                type="text"
                id="cert_key"
                name="cert_key"
                placeholder={t('placeholder.certKeyExample')}
                className="console-input"
              />
            </div>

            <div>
              <label htmlFor="cert_file" className="console-label">{t('vault.certFile')}</label>
              <label
                htmlFor="cert_file"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input-border rounded-lg cursor-pointer hover:border-brand hover:bg-page transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 text-ink-muted mb-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                  </svg>
                  {selectedFileName ? (
                    <p className="text-sm text-ink-secondary">
                      <span className="font-medium text-brand">{selectedFileName}</span>
                    </p>
                  ) : (
                    <p className="text-sm text-ink-secondary"><span className="font-medium text-brand">{t('vault.clickToUpload')}</span> {t('vault.dragAndDrop')}</p>
                  )}
                  <p className="text-xs text-ink-muted mt-1">.pem, .crt, .cer, .p12, .pfx, .key, .jks</p>
                </div>
                <input
                  type="file"
                  id="cert_file"
                  name="cert_file"
                  accept=".pem,.crt,.cer,.p12,.pfx,.key,.jks"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="console-button-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? (isEdit ? t('vault.updating') : t('vault.creating'))
              : (isEdit ? t('vault.updateCredentialSet') : t('vault.createCredentialSet'))
            }
          </button>
          <Link
            href="/vault"
            className="console-button-secondary"
          >
            {t('common.cancel')}
          </Link>
        </div>
      </form>
    </div>
  );
}
