'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
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
        <Link href="/vault" className="inline-flex items-center gap-1 text-[13px] text-ink-secondary hover:text-ink transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Credentials Vault
        </Link>
      </div>

      <h2 className="text-xl font-semibold text-ink mb-6">
        {isEdit ? 'Edit Credential Set' : 'Add Credential Set'}
      </h2>

      {errors && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-danger-light border border-danger-border text-danger text-sm">
          <p className="font-medium mb-1">Please fix the following errors:</p>
          <ul className="list-disc list-inside">
            {errors.map((err, idx) => (
              <li key={idx}>{err.field ? `${err.field}: ` : ''}{err.message}</li>
            ))}
          </ul>
        </div>
      )}

      <form action={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-border p-6 space-y-5">
          <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Credential Info</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="partner_name" className="block text-sm font-medium text-ink mb-1.5">
                Partner Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="partner_name"
                name="partner_name"
                required
                defaultValue={credential?.partner_name || ''}
                placeholder="e.g. Braza, Fincra, OCBC"
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              />
            </div>
            <div>
              <label htmlFor="environment" className="block text-sm font-medium text-ink mb-1.5">
                Environment <span className="text-danger">*</span>
              </label>
              <select
                id="environment"
                name="environment"
                required
                defaultValue={credential?.environment || 'sandbox'}
                className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
              >
                <option value="sandbox">Sandbox</option>
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="label" className="block text-sm font-medium text-ink mb-1.5">
              Label <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              id="label"
              name="label"
              required
              defaultValue={credential?.label || ''}
              placeholder="e.g. Braza Sandbox API Keys"
              className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-ink mb-1.5">Notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={credential?.notes || ''}
              placeholder="e.g. Expires 2026-12-31, rotation contact: team@partner.com"
              className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Secret Items</h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-sm text-brand hover:text-brand-dark font-medium"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Item
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
                  placeholder={isEdit ? 'Key (e.g. api_key)' : 'Key (e.g. api_key)'}
                  className="block w-1/3 rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
                <input
                  type="text"
                  name="item_value"
                  value={item.value}
                  onChange={(e) => updateItem(item.clientId, 'value', e.target.value)}
                  placeholder={isEdit ? 'Leave blank to keep existing value' : 'Value (will be encrypted)'}
                  className="block flex-1 rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.clientId)}
                  className="p-2 rounded-md text-ink-muted hover:text-danger hover:bg-danger-light transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border p-6 space-y-5">
          <h3 className="text-xs font-semibold text-ink-secondary uppercase tracking-wider">Certificate Upload</h3>

          <div>
            <label htmlFor="cert_key" className="block text-sm font-medium text-ink mb-1">Certificate Key Name</label>
            <p className="text-[12px] text-ink-muted mb-1.5">A label to identify this certificate in the vault</p>
            <input
              type="text"
              id="cert_key"
              name="cert_key"
              placeholder="e.g. tls_certificate"
              className="block w-full rounded-lg border border-input-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>

          <div>
            <label htmlFor="cert_file" className="block text-sm font-medium text-ink mb-1.5">Certificate File</label>
            <label
              htmlFor="cert_file"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-input-border rounded-lg cursor-pointer hover:border-brand hover:bg-page transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 text-ink-muted mb-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                {selectedFileName ? (
                  <p className="text-sm text-ink-secondary">
                    <span className="font-medium text-brand">{selectedFileName}</span>
                  </p>
                ) : (
                  <p className="text-sm text-ink-secondary"><span className="font-medium text-brand">Click to upload</span> or drag and drop</p>
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

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {isSubmitting
              ? (isEdit ? 'Updating...' : 'Creating...')
              : (isEdit ? 'Update Credential Set' : 'Create Credential Set')
            }
          </button>
          <Link
            href="/vault"
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-border text-ink hover:bg-page transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
