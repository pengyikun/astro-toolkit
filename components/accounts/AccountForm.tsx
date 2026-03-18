'use client';

import { useState, useCallback, useEffect, useTransition, useRef } from 'react';
import Link from 'next/link';
import { createAccount, updateAccount } from '@/actions/accounts';
import type { AccountWithFields, RegionSummary, RegionFieldDef, AccountField } from '@/types';

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
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Array<{ field: string; message: string }>>([]);

  // Step state
  const [currentStep, setCurrentStep] = useState(1);

  // Form field state
  const [name, setName] = useState(account?.name || '');
  const [regionCode, setRegionCode] = useState(account?.region_code || '');
  const [currency, setCurrency] = useState(account?.currency || '');
  const [accountType, setAccountType] = useState<string>(account?.account_type || 'mock');
  const [transferType, setTransferType] = useState<string>(genericFieldValues.transfer_type || 'domestic');
  const [notes, setNotes] = useState(account?.notes || '');

  // Generic bank fields
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

  // Region fields
  const [regionFields, setRegionFields] = useState<RegionFieldDef[]>([]);
  const [regionFieldValues, setRegionFieldValues] = useState<Record<string, string>>({});
  const [regionFieldsLoading, setRegionFieldsLoading] = useState(false);

  // Custom fields
  const initialCustomFields: CustomField[] = account?.fields
    ? account.fields
        .filter((f) => f.is_custom)
        .map((f) => ({ key: f.field_key, label: f.field_label, value: f.field_value || '' }))
    : [];
  const [customFields, setCustomFields] = useState<CustomField[]>(initialCustomFields);

  // Region search dropdown
  const [regionSearch, setRegionSearch] = useState(() => {
    if (account?.region_code) {
      const r = regions.find((reg) => reg.code === account.region_code);
      return r ? `${r.name} (${r.code})` : '';
    }
    return '';
  });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasBankAddress = Boolean(genericBankStreet || genericBankCity || genericBankState || genericBankPostal || genericBankCountry);

  // Initialize region field values from existing account
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadRegionFields = useCallback(async (code: string, clearValues = true) => {
    setRegionFieldsLoading(true);
    try {
      const response = await fetch(`/api/regions/${code}/fields`);
      const fields: RegionFieldDef[] = await response.json();
      setRegionFields(fields || []);
      if (clearValues) {
        const defaults: Record<string, string> = {};
        (fields || []).forEach((f) => { defaults[f.key] = ''; });
        setRegionFieldValues(defaults);
      }
    } catch {
      setRegionFields([]);
    } finally {
      setRegionFieldsLoading(false);
    }
  }, []);

  // Filter region options
  const filteredRegions = regions.filter((r) => {
    const q = regionSearch.toLowerCase().trim();
    if (!q) return true;
    return [r.name, r.code, r.currency].join(' ').toLowerCase().includes(q);
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  function selectRegion(r: RegionSummary) {
    setRegionCode(r.code);
    setRegionSearch(`${r.name} (${r.code})`);
    setCurrency(r.currency);
    setDropdownOpen(false);
    setHighlightedIndex(-1);
    if (transferType !== 'international') {
      loadRegionFields(r.code);
    }
  }

  function handleRegionSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredRegions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && filteredRegions[highlightedIndex]) {
      e.preventDefault();
      selectRegion(filteredRegions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
      setHighlightedIndex(-1);
    }
  }

  function handleRegionSearchInput(value: string) {
    setRegionSearch(value);
    setDropdownOpen(true);
    setHighlightedIndex(-1);
    if (!value.trim()) {
      setRegionCode('');
      setCurrency('');
      setRegionFields([]);
      setRegionFieldValues({});
    }
  }

  // Step navigation
  function showStep(step: number) {
    setCurrentStep(step);
    const panel = document.querySelector(`[data-step-panel="${step}"]`);
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleNextStep(targetStep: number) {
    showStep(targetStep);
  }

  function handlePrevStep(targetStep: number) {
    showStep(targetStep);
  }

  // Step completion logic
  const stepCompletion: Record<number, boolean> = {
    1: Boolean(name && regionCode && accountType && transferType),
    2: transferType === 'international'
      ? Boolean(genericAccountHolder || genericIban || genericSwiftBic)
      : Boolean(regionCode && regionFields.length > 0),
    3: true,
    4: false,
  };

  // Custom field handlers
  function addCustomField() {
    setCustomFields((prev) => [...prev, { key: '', label: '', value: '' }]);
  }

  function removeCustomField(index: number) {
    setCustomFields((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCustomField(index: number, field: Partial<CustomField>) {
    setCustomFields((prev) =>
      prev.map((cf, i) => (i === index ? { ...cf, ...field } : cf))
    );
  }

  function updateRegionFieldValue(key: string, value: string) {
    setRegionFieldValues((prev) => ({ ...prev, [key]: value }));
  }

  // Handle transfer type change
  function handleTransferTypeChange(value: string) {
    setTransferType(value);
    if (value !== 'international' && regionCode) {
      loadRegionFields(regionCode);
    }
  }

  // Form submission
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
        <div className="console-panel mt-6 p-5 border-danger-border bg-danger-light/70">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-danger mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <div>
              <div className="console-kicker text-danger/75">Please fix before saving</div>
              <ul className="mt-3 list-disc list-inside text-sm leading-relaxed text-danger">
                {errors.map((err, idx) => (
                  <li key={idx}>{err.field ? `${err.field}: ` : ''}{err.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="page-header-row mt-2">
        <div className="max-w-2xl">
          <h1 className="console-title">{isEdit ? 'Edit account' : 'New account'}</h1>
        </div>
        <div className={`signal-chip ${transferType === 'international' ? 'brand' : 'neutral'}`}>
          <span className="ops-chip-dot" />
          {transferType === 'international' ? 'International rail' : 'Domestic rail'}
        </div>
      </div>

      <form ref={formRef} action={handleSubmit} id="account-form" className="mt-6 step-layout">
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

        {/* Step rail sidebar */}
        <aside className="step-rail">
          <div className="console-panel p-4">
            <div className="console-kicker">Progress</div>
            <div className="mt-4 grid gap-3">
              {[
                { num: 1, title: 'Setup' },
                { num: 2, title: 'Routing' },
                { num: 3, title: 'Extras' },
                { num: 4, title: 'Review' },
              ].map((step) => (
                <button
                  key={step.num}
                  type="button"
                  className={`step-button ${currentStep === step.num ? 'is-active' : ''} ${stepCompletion[step.num] && currentStep !== step.num ? 'is-complete' : ''}`}
                  aria-current={currentStep === step.num ? 'step' : undefined}
                  onClick={() => showStep(step.num)}
                >
                  <span className="step-index">{step.num}</span>
                  <span>
                    <span className="step-title">{step.title}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="console-panel p-5">
            <div className="console-kicker">Live Summary</div>
            <div className="step-summary mt-4">
              <div className="step-summary-row">
                <div className="step-summary-label">Account</div>
                <div className="step-summary-value">{name || 'Unassigned'}</div>
              </div>
              <div className="step-summary-row">
                <div className="step-summary-label">Region</div>
                <div className="step-summary-value">{regionCode || 'Select region'}</div>
              </div>
              <div className="step-summary-row">
                <div className="step-summary-label">Currency</div>
                <div className="step-summary-value font-mono">{currency || '---'}</div>
              </div>
              <div className="step-summary-row">
                <div className="step-summary-label">Account Type</div>
                <div className="step-summary-value">{accountType || 'Choose type'}</div>
              </div>
              <div className="step-summary-row">
                <div className="step-summary-label">Rail</div>
                <div className="step-summary-value">{transferType}</div>
              </div>
            </div>
            <Link href="/accounts" className="console-button-secondary w-full mt-5">Cancel</Link>
          </div>
        </aside>

        {/* Step panels */}
        <div className="grid gap-6">
          {/* Step 1 — Setup */}
          <section className={`step-panel ${currentStep === 1 ? 'is-active' : ''}`} data-step-panel="1">
            <div className="step-frame">
              <div className="step-frame-head">
                <div className="console-kicker">Step 1</div>
                <h2 className="console-section-title mt-3">Account setup</h2>
              </div>
              <div className="step-frame-body">
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="lg:col-span-2">
                    <label htmlFor="name" className="console-label">Account Name</label>
                    <input
                      type="text"
                      id="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Brazil PIX Test Acct #1"
                      className="console-input"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="console-label">Country / Region</label>
                    <div className="relative" ref={dropdownRef}>
                      <input
                        type="text"
                        ref={searchInputRef}
                        autoComplete="off"
                        placeholder="Search by country, code, or currency"
                        value={regionSearch}
                        onFocus={() => setDropdownOpen(true)}
                        onChange={(e) => handleRegionSearchInput(e.target.value)}
                        onKeyDown={handleRegionSearchKeyDown}
                        className="console-input pr-12"
                      />
                      <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                      </svg>
                      {dropdownOpen && (
                        <div className="absolute z-30 top-full left-0 right-0 mt-2 console-panel overflow-hidden max-h-72 overflow-y-auto">
                          {filteredRegions.length > 0 ? (
                            filteredRegions.map((r, idx) => (
                              <div
                                key={r.code}
                                className={`region-option px-4 py-3 cursor-pointer hover:bg-brand-light/70 transition-colors ${idx === highlightedIndex ? 'bg-brand-light' : ''}`}
                                onClick={() => selectRegion(r)}
                              >
                                <div className="text-sm font-semibold text-ink">{r.name} <span className="text-ink-muted">({r.code})</span></div>
                                <div className="mt-1 text-xs text-ink-secondary">Settlement currency <span className="font-mono">{r.currency}</span></div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-4 text-sm text-ink-muted text-center">No matching regions</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="currency" className="console-label">Currency</label>
                    <input
                      type="text"
                      id="currency"
                      required
                      readOnly
                      value={currency}
                      placeholder="Selected from region"
                      className="console-input font-mono"
                    />
                  </div>

                  <div>
                    <label className="console-label">Account Type</label>
                    <div className="grid gap-3 sm:grid-cols-2">
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
                        <span className="record-card-title">Mock</span>
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
                        <span className="record-card-title">Real</span>
                      </label>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="console-label">Transfer Rail</label>
                    <div className="grid gap-3 sm:grid-cols-2">
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
                        <span className="record-card-title">Domestic</span>
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
                        <span className="record-card-title">International</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="step-nav">
                  <span />
                  <button type="button" className="console-button-primary" onClick={() => handleNextStep(2)}>Continue to routing</button>
                </div>
              </div>
            </div>
          </section>

          {/* Step 2 — Routing */}
          <section className={`step-panel ${currentStep === 2 ? 'is-active' : ''}`} data-step-panel="2">
            <div className="step-frame">
              <div className="step-frame-head">
                <div className="console-kicker">Step 2</div>
                <h2 className="console-section-title mt-3">Routing details</h2>
              </div>
              <div className="step-frame-body">
                <div className="grid gap-5">
                  <div className="console-panel p-5">
                    <div className="console-kicker">Account holder and bank</div>
                    <div className="grid gap-5 lg:grid-cols-2 mt-4">
                      <div>
                        <label htmlFor="generic_account_holder" className="console-label">Account Holder Name</label>
                        <input
                          type="text"
                          id="generic_account_holder"
                          value={genericAccountHolder}
                          onChange={(e) => setGenericAccountHolder(e.target.value)}
                          placeholder="Full legal name"
                          className="console-input"
                        />
                      </div>
                      <div>
                        <label htmlFor="generic_bank_name" className="console-label">Bank Name</label>
                        <input
                          type="text"
                          id="generic_bank_name"
                          value={genericBankName}
                          onChange={(e) => setGenericBankName(e.target.value)}
                          placeholder="e.g. NatWest Bank"
                          className="console-input"
                        />
                      </div>
                      <div className="lg:col-span-2">
                        <label htmlFor="generic_account_number" className="console-label">Primary Account Number</label>
                        <input
                          type="text"
                          id="generic_account_number"
                          value={genericAccountNumber}
                          onChange={(e) => setGenericAccountNumber(e.target.value)}
                          placeholder="Core bank account number"
                          className="console-input font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* International wire details */}
                  {transferType === 'international' && (
                    <div className="console-panel p-5">
                      <div className="console-kicker">International wire details</div>
                      <div className="grid gap-5 lg:grid-cols-2 mt-4">
                        <div>
                          <label htmlFor="generic_iban" className="console-label">IBAN</label>
                          <input
                            type="text"
                            id="generic_iban"
                            value={genericIban}
                            onChange={(e) => setGenericIban(e.target.value)}
                            placeholder="e.g. GB29NWBK60161331926819"
                            className="console-input font-mono"
                          />
                        </div>
                        <div>
                          <label htmlFor="generic_swift_bic" className="console-label">SWIFT / BIC</label>
                          <input
                            type="text"
                            id="generic_swift_bic"
                            value={genericSwiftBic}
                            onChange={(e) => setGenericSwiftBic(e.target.value)}
                            placeholder="e.g. NWBKGB2L"
                            className="console-input font-mono"
                          />
                        </div>
                        <div>
                          <label htmlFor="generic_intermediary_bank" className="console-label">Intermediary Bank</label>
                          <input
                            type="text"
                            id="generic_intermediary_bank"
                            value={genericIntermediaryBank}
                            onChange={(e) => setGenericIntermediaryBank(e.target.value)}
                            placeholder="Only if a correspondent bank is required"
                            className="console-input"
                          />
                        </div>
                        <div>
                          <label htmlFor="generic_intermediary_swift" className="console-label">Intermediary SWIFT</label>
                          <input
                            type="text"
                            id="generic_intermediary_swift"
                            value={genericIntermediarySwift}
                            onChange={(e) => setGenericIntermediarySwift(e.target.value)}
                            placeholder="Intermediary bank SWIFT/BIC"
                            className="console-input font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Domestic region fields */}
                  {transferType !== 'international' && regionCode && (
                    <div className="console-panel p-5">
                      <div className="console-kicker">Local banking details</div>
                      <div className="mt-2 text-sm text-ink-secondary">
                        Fields loaded for <span className="font-semibold text-ink">{regionCode}</span>.
                      </div>
                      <div className="grid gap-5 mt-4">
                        {regionFieldsLoading ? (
                          <p className="text-sm text-ink-secondary">Loading schema for {regionCode}...</p>
                        ) : regionFields.length > 0 ? (
                          regionFields.map((field) => (
                            <div key={field.key}>
                              <label className="console-label">
                                {field.label}
                                {field.required && <span className="text-danger"> *</span>}
                              </label>
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
                                <select
                                  className="console-select"
                                  required={field.required}
                                  value={regionFieldValues[field.key] || ''}
                                  onChange={(e) => updateRegionFieldValue(field.key, e.target.value)}
                                >
                                  <option value="">Select...</option>
                                  {field.options.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  className="console-input"
                                  placeholder={field.placeholder || ''}
                                  required={field.required}
                                  pattern={field.validation || undefined}
                                  value={regionFieldValues[field.key] || ''}
                                  onChange={(e) => updateRegionFieldValue(field.key, e.target.value)}
                                />
                              )}
                            </div>
                          ))
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>

                <div className="step-nav">
                  <button type="button" className="console-button-secondary" onClick={() => handlePrevStep(1)}>Back</button>
                  <button type="button" className="console-button-primary" onClick={() => handleNextStep(3)}>Continue to extras</button>
                </div>
              </div>
            </div>
          </section>

          {/* Step 3 — Extras */}
          <section className={`step-panel ${currentStep === 3 ? 'is-active' : ''}`} data-step-panel="3">
            <div className="step-frame">
              <div className="step-frame-head">
                <div className="console-kicker">Step 3</div>
                <h2 className="console-section-title mt-3">Optional details</h2>
              </div>
              <div className="step-frame-body">
                <div className="grid gap-5">
                  <div className="console-panel p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="console-kicker">Bank address</div>
                      </div>
                      <span className={`signal-chip ${hasBankAddress ? 'brand' : 'neutral'}`}>
                        {hasBankAddress ? 'Pre-filled' : 'Optional'}
                      </span>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2 mt-5">
                      <div className="lg:col-span-2">
                        <label htmlFor="generic_bank_street" className="console-label">Street Address</label>
                        <input
                          type="text"
                          id="generic_bank_street"
                          value={genericBankStreet}
                          onChange={(e) => setGenericBankStreet(e.target.value)}
                          placeholder="Street name and number"
                          className="console-input"
                        />
                      </div>
                      <div>
                        <label htmlFor="generic_bank_city" className="console-label">City</label>
                        <input
                          type="text"
                          id="generic_bank_city"
                          value={genericBankCity}
                          onChange={(e) => setGenericBankCity(e.target.value)}
                          placeholder="City"
                          className="console-input"
                        />
                      </div>
                      <div>
                        <label htmlFor="generic_bank_state" className="console-label">State / Province</label>
                        <input
                          type="text"
                          id="generic_bank_state"
                          value={genericBankState}
                          onChange={(e) => setGenericBankState(e.target.value)}
                          placeholder="State or province"
                          className="console-input"
                        />
                      </div>
                      <div>
                        <label htmlFor="generic_bank_postal" className="console-label">Postal / ZIP Code</label>
                        <input
                          type="text"
                          id="generic_bank_postal"
                          value={genericBankPostal}
                          onChange={(e) => setGenericBankPostal(e.target.value)}
                          placeholder="Postal code"
                          className="console-input"
                        />
                      </div>
                      <div>
                        <label htmlFor="generic_bank_country" className="console-label">Country</label>
                        <input
                          type="text"
                          id="generic_bank_country"
                          value={genericBankCountry}
                          onChange={(e) => setGenericBankCountry(e.target.value)}
                          placeholder="Country"
                          className="console-input"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="console-panel p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="console-kicker">Custom fields</div>
                      </div>
                      <button type="button" onClick={addCustomField} className="console-button-secondary !min-h-0 !px-4 !py-2 text-sm">Add Field</button>
                    </div>

                    <div className="grid gap-3 mt-5">
                      {customFields.length > 0 ? (
                        customFields.map((cf, idx) => (
                          <div key={idx} className="custom-field-row grid gap-3 lg:grid-cols-[1fr_1fr_1.3fr_auto]">
                            <input
                              type="text"
                              placeholder="field_key"
                              className="console-input font-mono"
                              value={cf.key}
                              onChange={(e) => updateCustomField(idx, { key: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="Display label"
                              className="console-input"
                              value={cf.label}
                              onChange={(e) => updateCustomField(idx, { label: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="Stored value"
                              className="console-input"
                              value={cf.value}
                              onChange={(e) => updateCustomField(idx, { value: e.target.value })}
                            />
                            <button type="button" onClick={() => removeCustomField(idx)} className="console-button-danger !min-h-0 !px-4 !py-2">Remove</button>
                          </div>
                        ))
                      ) : (
                        <div className="console-empty" id="custom-fields-empty">
                          <div className="console-empty-icon">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.7" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                          </div>
                          <div>
                            <h3>No custom fields yet</h3>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="step-nav">
                  <button type="button" className="console-button-secondary" onClick={() => handlePrevStep(2)}>Back</button>
                  <button type="button" className="console-button-primary" onClick={() => handleNextStep(4)}>Review account</button>
                </div>
              </div>
            </div>
          </section>

          {/* Step 4 — Review */}
          <section className={`step-panel ${currentStep === 4 ? 'is-active' : ''}`} data-step-panel="4">
            <div className="step-frame">
              <div className="step-frame-head">
                <div className="console-kicker">Step 4</div>
                <h2 className="console-section-title mt-3">Review and save</h2>
              </div>
              <div className="step-frame-body">
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                  <div className="console-panel p-5">
                    <div className="console-kicker">Operator notes</div>
                    <label htmlFor="notes" className="console-label mt-4">Notes for handoff</label>
                    <textarea
                      id="notes"
                      rows={6}
                      placeholder="What should the next PM or operator know about this account?"
                      className="console-textarea"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="console-panel p-5">
                    <div className="console-kicker">Review snapshot</div>
                    <dl className="step-review-list mt-4">
                      <div className="step-review-item">
                        <dt>Account name</dt>
                        <dd>{name || 'Unassigned'}</dd>
                      </div>
                      <div className="step-review-item">
                        <dt>Region and currency</dt>
                        <dd><span>{regionCode || 'Select region'}</span> / <span>{currency || '---'}</span></dd>
                      </div>
                      <div className="step-review-item">
                        <dt>Operating mode</dt>
                        <dd><span>{accountType || 'Choose type'}</span> / <span>{transferType}</span></dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="step-nav">
                  <button type="button" className="console-button-secondary" onClick={() => handlePrevStep(3)}>Back</button>
                  <button type="submit" className="console-button-primary" disabled={isPending}>
                    {isPending ? 'Saving...' : isEdit ? 'Update Account' : 'Create Account'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </form>
    </>
  );
}
