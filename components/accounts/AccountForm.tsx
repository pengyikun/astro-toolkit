'use client';

import { useState, useCallback, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { createAccount, updateAccount } from '@/actions/accounts';
import type { AccountWithFields, RegionSummary, RegionFieldDef } from '@/types';
import { useLocale } from '@/lib/i18n/client';
import { ErrorCircleIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface CustomField {
  key: string;
  label: string;
  value: string;
}

interface AccountFormProps {
  regions: RegionSummary[];
  account?: AccountWithFields | null;
  genericFieldValues?: Record<string, string>;
}

export default function AccountForm({ regions, account, genericFieldValues = {} }: AccountFormProps) {
  const isEdit = Boolean(account?.id);
  const { t } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);

  const [name, setName] = useState(account?.name || '');
  const [regionCode, setRegionCode] = useState(account?.region_code || '');
  const [currency, setCurrency] = useState(account?.currency || '');
  const [accountType, setAccountType] = useState<string>(account?.account_type || 'mock');
  const [transferType, setTransferType] = useState<string>(genericFieldValues.transfer_type || 'domestic');
  const [notes, setNotes] = useState(account?.notes || '');

  const [genericAccountHolder, setGenericAccountHolder] = useState(genericFieldValues.generic_account_holder || '');
  const [genericBankName, setGenericBankName] = useState(genericFieldValues.generic_bank_name || '');
  const [genericAccountNumber, setGenericAccountNumber] = useState(genericFieldValues.generic_account_number || '');
  const [genericIban, setGenericIban] = useState(genericFieldValues.generic_iban || '');
  const [genericSwiftBic, setGenericSwiftBic] = useState(genericFieldValues.generic_swift_bic || '');
  const [genericIntermediaryBank, setGenericIntermediaryBank] = useState(genericFieldValues.generic_intermediary_bank || '');
  const [genericIntermediarySwift, setGenericIntermediarySwift] = useState(genericFieldValues.generic_intermediary_swift || '');
  const [genericBankStreet, setGenericBankStreet] = useState(genericFieldValues.generic_bank_street || '');
  const [genericBankCity, setGenericBankCity] = useState(genericFieldValues.generic_bank_city || '');
  const [genericBankState, setGenericBankState] = useState(genericFieldValues.generic_bank_state || '');
  const [genericBankPostal, setGenericBankPostal] = useState(genericFieldValues.generic_bank_postal || '');
  const [genericBankCountry, setGenericBankCountry] = useState(genericFieldValues.generic_bank_country || '');

  const [regionFields, setRegionFields] = useState<RegionFieldDef[]>([]);
  const [regionFieldValues, setRegionFieldValues] = useState<Record<string, string>>({});
  const [regionFieldsLoading, setRegionFieldsLoading] = useState(false);

  const initialCustomFields: CustomField[] = account?.fields
    ? account.fields
        .filter((f) => f.is_custom)
        .map((f) => ({ key: f.field_key, label: f.field_label, value: f.field_value || '' }))
    : [];
  const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);

  const hasBankAddress = Boolean(
    genericBankStreet || genericBankCity || genericBankState || genericBankPostal || genericBankCountry
  );

  const loadRegionFields = useCallback(async (code: string, clearValues = true) => {
    setRegionFieldsLoading(true);
    try {
      const response = await fetch(`/api/regions/${code}/fields`);
      const fields: RegionFieldDef[] = await response.json();
      setRegionFields(fields || []);
      if (clearValues) {
        const defaults: Record<string, string> = {};
        (fields || []).forEach((field) => {
          defaults[field.key] = '';
        });
        setRegionFieldValues(defaults);
      }
    } catch {
      setRegionFields([]);
    } finally {
      setRegionFieldsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (account?.fields && account.region_code) {
      const existingValues: Record<string, string> = {};
      account.fields
        .filter((f) => !f.is_custom && !f.field_key.startsWith('generic_') && f.field_key !== 'transfer_type')
        .forEach((f) => {
          existingValues[f.field_key] = f.field_value || '';
        });
      setRegionFieldValues(existingValues);
      loadRegionFields(account.region_code, false);
    }
  }, [account, loadRegionFields]);

  function selectRegionByCode(code: string) {
    const region = regions.find((entry) => entry.code === code);
    if (!region) return;

    setRegionCode(region.code);
    setCurrency(region.currency);
    if (transferType === 'international') {
      setRegionFields([]);
      setRegionFieldValues({});
      return;
    }
    loadRegionFields(region.code);
  }

  function addCustomField() {
    setCustomFields((prev) => [...prev, { key: '', label: '', value: '' }]);
  }

  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCustomField(index: number, field: Partial<CustomField>) {
    setCustomFields((prev) => prev.map((cf, i) => (i === index ? { ...cf, ...field } : cf)));
  }

  function updateRegionFieldValue(key: string, value: string) {
    setRegionFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleTransferTypeChange(value: string) {
    setTransferType(value);
    if (value === 'international') {
      setRegionFields([]);
      setRegionFieldValues({});
      return;
    }
    if (regionCode) {
      loadRegionFields(regionCode);
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      let result;
      if (isEdit && account?.id) {
        const boundUpdate = updateAccount.bind(null, account.id);
        result = await boundUpdate(formData);
      } else {
        result = await createAccount(formData);
      }

      if (result && !result.success && result.errors) {
        setErrors(result.errors);
      }
    });
  }

  return (
    <>
      {errors.length > 0 && (
        <Card role="alert" className="mt-6 border-danger-border bg-danger-light/70">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <ErrorCircleIcon className="mt-0.5 h-5 w-5 text-danger" />
              <div>
                <div className="console-kicker text-danger/75">{t('accounts.pleaseFixBeforeSaving')}</div>
                <ul className="mt-3 list-inside list-disc text-sm leading-relaxed text-danger">
                  {errors.map((err, idx) => (
                    <li key={idx}>
                      {err.field ? `${err.field}: ` : ''}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form action={handleSubmit} id="account-form" className="mt-6 grid gap-6">
        <div className="hidden">
          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="region_code" value={regionCode} />
          <input type="hidden" name="currency" value={currency} />
          <input type="hidden" name="account_type" value={accountType} />
          <input type="hidden" name="notes" value={notes} />
          <input type="hidden" name="transfer_type" value={transferType} />
          <input type="hidden" name="generic_account_holder" value={genericAccountHolder} />
          <input type="hidden" name="generic_bank_name" value={genericBankName} />
          <input type="hidden" name="generic_account_number" value={genericAccountNumber} />
          <input type="hidden" name="generic_iban" value={genericIban} />
          <input type="hidden" name="generic_swift_bic" value={genericSwiftBic} />
          <input type="hidden" name="generic_intermediary_bank" value={genericIntermediaryBank} />
          <input type="hidden" name="generic_intermediary_swift" value={genericIntermediarySwift} />
          <input type="hidden" name="generic_bank_street" value={genericBankStreet} />
          <input type="hidden" name="generic_bank_city" value={genericBankCity} />
          <input type="hidden" name="generic_bank_state" value={genericBankState} />
          <input type="hidden" name="generic_bank_postal" value={genericBankPostal} />
          <input type="hidden" name="generic_bank_country" value={genericBankCountry} />
          {regionFields.map((field) => (
            <span key={`hidden-region-${field.key}`}>
              <input type="hidden" name="field_key" value={field.key} />
              <input type="hidden" name="field_label" value={field.label} />
              <input type="hidden" name="field_value" value={regionFieldValues[field.key] || ''} />
              <input type="hidden" name="field_type" value={field.type || 'text'} />
              <input type="hidden" name="field_is_custom" value="0" />
            </span>
          ))}
          {customFields.map((cf, idx) => (
            <span key={`hidden-custom-${idx}`}>
              <input type="hidden" name="field_key" value={cf.key} />
              <input type="hidden" name="field_label" value={cf.label} />
              <input type="hidden" name="field_value" value={cf.value} />
              <input type="hidden" name="field_type" value="text" />
              <input type="hidden" name="field_is_custom" value="1" />
            </span>
          ))}
        </div>

        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="space-y-1">
              <h2 className="console-section-title">{t('accounts.routingDetails')}</h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <Label htmlFor="name">{t('accounts.accountName')}</Label>
                <Input
                  type="text"
                  id="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('placeholder.accountNameExample')}
                />
              </div>

              <div>
                <Label htmlFor="region-code">{t('accounts.region')}</Label>
                <Select value={regionCode} onValueChange={selectRegionByCode}>
                  <SelectTrigger id="region-code">
                    <SelectValue placeholder={`${t('common.select')} ${t('common.region').toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.code} value={region.code}>
                        {region.name} ({region.code}) · {region.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t('accounts.transferRail')}</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={`record-card cursor-pointer ${transferType === 'domestic' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="transfer_type_radio"
                      value="domestic"
                      required
                      checked={transferType === 'domestic'}
                      onChange={() => handleTransferTypeChange('domestic')}
                      className="sr-only transfer-type-radio"
                    />
                    <span className="record-card-title">{t('accounts.domestic')}</span>
                  </label>
                  <label className={`record-card cursor-pointer ${transferType === 'international' ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="transfer_type_radio"
                      value="international"
                      required
                      checked={transferType === 'international'}
                      onChange={() => handleTransferTypeChange('international')}
                      className="sr-only transfer-type-radio"
                    />
                    <span className="record-card-title">{t('accounts.international')}</span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="currency">{t('common.currency')}</Label>
                <Input
                  type="text"
                  id="currency"
                  required
                  readOnly={transferType !== 'international'}
                  value={currency}
                  onChange={(e) => {
                    if (transferType === 'international') {
                      setCurrency(e.target.value.toUpperCase());
                    }
                  }}
                  placeholder={
                    transferType === 'international'
                      ? t('accounts.enterCurrencyCode')
                      : t('accounts.selectedFromRegion')
                  }
                  className="font-mono"
                />
                {transferType === 'international' && (
                  <p className="mt-1 console-helper-copy">{t('accounts.currencyOverrideHint')}</p>
                )}
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-6">
              <h3 className="text-sm font-semibold text-ink">{t('accounts.bankAccountDetails')}</h3>
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <Label htmlFor="generic_bank_name">{t('accounts.bankName')}</Label>
                  <Input
                    type="text"
                    id="generic_bank_name"
                    value={genericBankName}
                    onChange={(e) => setGenericBankName(e.target.value)}
                    placeholder={t('placeholder.bankNameExample')}
                  />
                </div>
                <div>
                  <Label htmlFor="generic_account_number">{t('accounts.accountNumber')}</Label>
                  <Input
                    type="text"
                    id="generic_account_number"
                    value={genericAccountNumber}
                    onChange={(e) => setGenericAccountNumber(e.target.value)}
                    placeholder={t('placeholder.accountNumber')}
                    className="font-mono"
                  />
                </div>
              </div>
            </div>

            {transferType === 'international' && (
              <div className="space-y-4 border-t border-border pt-6">
                <h3 className="text-sm font-semibold text-ink">{t('accounts.internationalWireDetails')}</h3>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <Label htmlFor="generic_iban">{t('accounts.iban')}</Label>
                    <Input
                      type="text"
                      id="generic_iban"
                      value={genericIban}
                      onChange={(e) => setGenericIban(e.target.value)}
                      placeholder={t('placeholder.ibanExample')}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="generic_swift_bic">{t('accounts.swiftBic')}</Label>
                    <Input
                      type="text"
                      id="generic_swift_bic"
                      value={genericSwiftBic}
                      onChange={(e) => setGenericSwiftBic(e.target.value)}
                      placeholder={t('placeholder.swiftExample')}
                      className="font-mono"
                    />
                  </div>
                  <div>
                    <Label htmlFor="generic_intermediary_bank">{t('accounts.intermediaryBank')}</Label>
                    <Input
                      type="text"
                      id="generic_intermediary_bank"
                      value={genericIntermediaryBank}
                      onChange={(e) => setGenericIntermediaryBank(e.target.value)}
                      placeholder={t('placeholder.intermediaryNote')}
                    />
                  </div>
                  <div>
                    <Label htmlFor="generic_intermediary_swift">{t('accounts.intermediarySwift')}</Label>
                    <Input
                      type="text"
                      id="generic_intermediary_swift"
                      value={genericIntermediarySwift}
                      onChange={(e) => setGenericIntermediarySwift(e.target.value)}
                      placeholder={t('placeholder.intermediarySwift')}
                      className="font-mono"
                    />
                  </div>
                </div>
              </div>
            )}

            {transferType !== 'international' && regionCode && (
              <div className="space-y-4 border-t border-border pt-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-ink">{t('accounts.localBankingDetails')}</h3>
                  <p className="text-sm text-ink-secondary">
                    {t('accounts.fieldsLoadedFor')} <span className="font-semibold text-ink">{regionCode}</span>.
                  </p>
                </div>

                <div className="grid gap-4">
                  {regionFieldsLoading ? (
                    <p className="text-sm text-ink-secondary">
                      {t('accounts.loadingSchema')} {regionCode}...
                    </p>
                  ) : (
                    regionFields.map((field) => (
                      <div key={field.key}>
                        <Label>
                          {field.label}
                          {field.required && (
                            <span className="text-danger" aria-hidden="true">
                              {' '}
                              *
                            </span>
                          )}
                        </Label>
                        {field.type === 'textarea' ? (
                          <textarea
                            rows={3}
                            className="console-textarea"
                            placeholder={field.placeholder || ''}
                            required={field.required}
                            value={regionFieldValues[field.key] || ''}
                            onChange={(e) => updateRegionFieldValue(field.key, e.target.value)}
                          />
                        ) : field.type === 'select' && field.options ? (
                          <Select
                            name={field.key}
                            defaultValue={regionFieldValues[field.key] || ''}
                            onValueChange={(value) => updateRegionFieldValue(field.key, value)}
                            required={field.required}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`${t('common.select')}...`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                  {opt}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            type="text"
                            placeholder={field.placeholder || ''}
                            required={field.required}
                            pattern={field.validation || undefined}
                            value={regionFieldValues[field.key] || ''}
                            onChange={(e) => updateRegionFieldValue(field.key, e.target.value)}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6 p-6">
            <h2 className="console-section-title">{t('accounts.beneficiaryDetails')}</h2>

            <div>
              <Label htmlFor="generic_account_holder">{t('accounts.accountHolder')}</Label>
              <Input
                type="text"
                id="generic_account_holder"
                value={genericAccountHolder}
                onChange={(e) => setGenericAccountHolder(e.target.value)}
                placeholder={t('placeholder.fullLegalName')}
              />
            </div>

            <details open={hasBankAddress} className="border-t border-border pt-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <h3 className="text-sm font-semibold text-ink">{t('accounts.beneficiaryAddress')}</h3>
                <span className="text-xs font-medium text-ink-secondary">
                  {hasBankAddress ? t('accounts.preFilled') : t('accounts.optional')}
                </span>
              </summary>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <Label htmlFor="generic_bank_street">{t('accounts.street')}</Label>
                  <Input
                    type="text"
                    id="generic_bank_street"
                    value={genericBankStreet}
                    onChange={(e) => setGenericBankStreet(e.target.value)}
                    placeholder={t('placeholder.streetAddress')}
                  />
                </div>
                <div>
                  <Label htmlFor="generic_bank_city">{t('accounts.city')}</Label>
                  <Input
                    type="text"
                    id="generic_bank_city"
                    value={genericBankCity}
                    onChange={(e) => setGenericBankCity(e.target.value)}
                    placeholder={t('accounts.city')}
                  />
                </div>
                <div>
                  <Label htmlFor="generic_bank_state">{t('accounts.stateProvince')}</Label>
                  <Input
                    type="text"
                    id="generic_bank_state"
                    value={genericBankState}
                    onChange={(e) => setGenericBankState(e.target.value)}
                    placeholder={t('placeholder.stateProvince')}
                  />
                </div>
                <div>
                  <Label htmlFor="generic_bank_postal">{t('accounts.postalCode')}</Label>
                  <Input
                    type="text"
                    id="generic_bank_postal"
                    value={genericBankPostal}
                    onChange={(e) => setGenericBankPostal(e.target.value)}
                    placeholder={t('placeholder.postalCode')}
                  />
                </div>
                <div>
                  <Label htmlFor="generic_bank_country">{t('accounts.country')}</Label>
                  <Input
                    type="text"
                    id="generic_bank_country"
                    value={genericBankCountry}
                    onChange={(e) => setGenericBankCountry(e.target.value)}
                    placeholder={t('accounts.country')}
                  />
                </div>
              </div>
            </details>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-6 p-6">
            <h2 className="console-section-title">{t('accounts.extraDetails')}</h2>

            <div>
              <Label>{t('accounts.accountType')}</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className={`record-card cursor-pointer ${accountType === 'mock' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="account_type_radio"
                    value="mock"
                    required
                    checked={accountType === 'mock'}
                    onChange={() => setAccountType('mock')}
                    className="sr-only account-type-radio"
                  />
                  <span className="record-card-title">{t('accounts.mock')}</span>
                </label>
                <label className={`record-card cursor-pointer ${accountType === 'real' ? 'is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="account_type_radio"
                    value="real"
                    required
                    checked={accountType === 'real'}
                    onChange={() => setAccountType('real')}
                    className="sr-only account-type-radio"
                  />
                  <span className="record-card-title">{t('accounts.real')}</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">{t('accounts.notesForHandoff')}</Label>
              <textarea
                id="notes"
                rows={4}
                placeholder={t('accounts.notesForHandoff')}
                className="console-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <details open={customFields.length > 0} className="border-t border-border pt-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <h3 className="text-sm font-semibold text-ink">{t('accounts.customFields')}</h3>
                <span className="text-xs font-medium text-ink-secondary">
                  {customFields.length > 0 ? `${customFields.length}` : t('accounts.optional')}
                </span>
              </summary>

              <div className="mt-4 space-y-3">
                <div className="flex justify-start">
                  <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                    {t('accounts.addField')}
                  </Button>
                </div>

                {customFields.length > 0 ? (
                  customFields.map((cf, idx) => (
                    <div key={idx} className="grid gap-2 lg:grid-cols-[1fr_1fr_1.3fr_auto]">
                      <Input
                        type="text"
                        placeholder={t('placeholder.fieldKey')}
                        className="font-mono"
                        value={cf.key}
                        onChange={(e) => updateCustomField(idx, { key: e.target.value })}
                      />
                      <Input
                        type="text"
                        placeholder={t('accounts.displayLabel')}
                        value={cf.label}
                        onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                      />
                      <Input
                        type="text"
                        placeholder={t('accounts.storedValue')}
                        value={cf.value}
                        onChange={(e) => updateCustomField(idx, { value: e.target.value })}
                      />
                      <Button type="button" variant="destructive" size="sm" onClick={() => removeCustomField(idx)}>
                        {t('accounts.removeField')}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-ink-secondary">{t('accounts.noCustomFieldsYet')}</p>
                )}
              </div>
            </details>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" asChild>
            <Link href="/accounts">{t('common.cancel')}</Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? t('accounts.savingAccount') : isEdit ? t('accounts.updateAccount') : t('accounts.createAccountBtn')}
          </Button>
        </div>
      </form>
    </>
  );
}
