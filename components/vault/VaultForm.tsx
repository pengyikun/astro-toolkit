'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ErrorCircleIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FileUploadTrigger } from '@/components/ui/file-upload-trigger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
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
  const certFileInputRef = useRef<HTMLInputElement>(null);

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
    <>
      {errors && (
        <Card role="alert" className="mb-6 border-danger-border bg-danger-light/70">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <ErrorCircleIcon className="mt-0.5 h-5 w-5 text-danger" />
              <div>
                <p className="console-kicker text-danger/75">{t('vault.fixErrors')}</p>
                <ul className="mt-3 list-inside list-disc text-sm leading-relaxed text-danger">
                  {errors.map((err, idx) => (
                    <li key={idx}>{err.field ? `${err.field}: ` : ''}{err.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form action={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="console-inline-label">{t('vault.credentialInfo')}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partner_name">
                  {t('vault.partnerName')} <span className="text-danger" aria-hidden="true">*</span>
                </Label>
                <Input
                  type="text"
                  id="partner_name"
                  name="partner_name"
                  required
                  defaultValue={credential?.partner_name || ''}
                  placeholder={t('placeholder.partnerExample')}
                />
              </div>
              <div>
                <Label htmlFor="environment">
                  {t('common.environment')} <span className="text-danger" aria-hidden="true">*</span>
                </Label>
                <Select name="environment" defaultValue={credential?.environment || 'sandbox'} required>
                  <SelectTrigger id="environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">{t('vault.sandbox')}</SelectItem>
                    <SelectItem value="staging">{t('vault.staging')}</SelectItem>
                    <SelectItem value="uat">{t('vault.uat')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="label">
                {t('common.label')} <span className="text-danger" aria-hidden="true">*</span>
              </Label>
              <Input
                type="text"
                id="label"
                name="label"
                required
                defaultValue={credential?.label || ''}
                placeholder={t('placeholder.labelExample')}
              />
            </div>

            <div>
              <Label htmlFor="notes">{t('common.notes')}</Label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                defaultValue={credential?.notes || ''}
                placeholder={t('placeholder.notesExample')}
                className="console-textarea"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="console-inline-label">{t('vault.secretItems')}</h3>
              <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                {t('vault.addItem')}
              </Button>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.clientId} className="flex gap-3 items-start vault-item-row">
                  <Input
                    type="text"
                    name="item_key"
                    value={item.key}
                    onChange={(e) => updateItem(item.clientId, 'key', e.target.value)}
                    placeholder={t('vault.keyPlaceholder')}
                    className="w-1/3"
                  />
                  <Input
                    type="text"
                    name="item_value"
                    value={item.value}
                    onChange={(e) => updateItem(item.clientId, 'value', e.target.value)}
                    placeholder={isEdit ? t('vault.leaveBlankToKeep') : t('vault.valuePlaceholder')}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => removeItem(item.clientId)}
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 text-ink-muted hover:text-danger"
                    aria-label={t('common.remove')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="console-inline-label">{t('vault.certificateUpload')}</h3>

            <div>
              <Label htmlFor="cert_key">{t('vault.certKeyName')}</Label>
              <p className="mb-1.5 console-helper-copy">{t('vault.certIdentifyLabel')}</p>
              <Input
                type="text"
                id="cert_key"
                name="cert_key"
                placeholder={t('placeholder.certKeyExample')}
              />
            </div>

            <div>
              <Label htmlFor="cert_file">{t('vault.certFile')}</Label>
              <FileUploadTrigger
                id="cert_file"
                ref={certFileInputRef}
                name="cert_file"
                accept=".pem,.crt,.cer,.p12,.pfx,.key,.jks"
                onChange={handleFileChange}
                fileName={selectedFileName}
                actionLabel={t('vault.clickToUpload')}
                promptLabel={t('vault.dragAndDrop')}
                helperText=".pem, .crt, .cer, .p12, .pfx, .key, .jks"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? (isEdit ? t('vault.updating') : t('vault.creating'))
              : (isEdit ? t('vault.updateCredentialSet') : t('vault.createCredentialSet'))
            }
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto">
            <Link href="/vault">
              {t('common.cancel')}
            </Link>
          </Button>
        </div>
      </form>
    </>
  );
}
