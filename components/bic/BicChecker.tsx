'use client';

import { useState, useTransition } from 'react';
import { checkBIC, type BICCheckResult } from '@/actions/bic';
import LEIEntityCard from '@/components/ui/LEIEntityCard';
import { useLocale } from '@/lib/i18n/client';

function BoolPill({ value, trueClass, falseClass, yesLabel, noLabel }: { value: boolean; trueClass: string; falseClass: string; yesLabel?: string; noLabel?: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${value ? trueClass : falseClass}`}>
      {value ? (yesLabel ?? 'Yes') : (noLabel ?? 'No')}
    </span>
  );
}

export default function BicChecker() {
  const { t } = useLocale();
  const [input, setInput] = useState('');
  const [data, setData] = useState<BICCheckResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    const formData = new FormData();
    formData.set('bic', input);
    startTransition(async () => {
      const result = await checkBIC(formData);
      setData(result);
    });
  };

  const result = data?.result;
  const leiEntity = data?.leiEntity;

  return (
    <>
      <section className="section-block">
        <div className="console-panel">
          <div className="console-panel-body">
            <form onSubmit={handleSubmit} className="space-y-4">
              <label htmlFor="bic-input" className="console-label">{t('bic.enterBic')}</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  id="bic-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('placeholder.bicExample')}
                  autoComplete="off"
                  className="console-input flex-1 font-mono text-base tracking-[0.16em]"
                />
                <button
                  type="submit"
                  disabled={isPending}
                  aria-busy={isPending}
                  className={`console-button-primary whitespace-nowrap sm:min-w-[8rem] flex items-center justify-center gap-2 ${isPending ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isPending && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isPending ? t('bic.checking') : t('bic.validate')}</span>
                </button>
              </div>
            </form>
            <div className="helper-list mt-5">
              <div className="helper-row">
                <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                <span>{t('bic.helperText')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {result && (
        <section className="section-block" aria-live="polite" aria-label={t('a11y.validationResult')}>
          {result.valid ? (
            <>
              <div className="console-panel overflow-hidden border-l-4 border-l-success">
                <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
                    <span className="text-sm font-semibold text-success">{t('bic.validBic')}</span>
                  </div>
                  <div className="font-mono text-lg tracking-widest text-ink bg-page rounded-lg px-4 py-3 text-center">
                    {result.bic}
                  </div>
                </div>
                <div className="px-4 sm:px-6 pb-4 sm:pb-6">
                  <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                    <div className="space-y-0 divide-y divide-border">
                      <div className="flex justify-between py-3">
                        <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('bic.institutionCode')}</dt>
                        <dd className="text-sm text-ink font-mono">{result.institution_code}</dd>
                      </div>
                      <div className="flex justify-between py-3">
                        <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('bic.country')}</dt>
                        <dd className="text-sm text-ink">{result.country_name} ({result.country_code})</dd>
                      </div>
                      <div className="flex justify-between py-3">
                        <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('bic.locationCode')}</dt>
                        <dd className="text-sm text-ink font-mono">{result.location_code}</dd>
                      </div>
                      <div className="flex justify-between py-3">
                        <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('bic.branchCode')}</dt>
                        <dd className="text-sm text-ink font-mono">{result.branch_code || t('bic.naBranchCode')}</dd>
                      </div>
                    </div>
                    <div className="space-y-0 divide-y divide-border">
                      <div className="flex justify-between items-center py-3">
                        <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('bic.primaryOffice')}</dt>
                        <dd><BoolPill value={!!result.is_primary_office} trueClass="bg-success-light text-success" falseClass="bg-page text-ink-secondary" yesLabel={t('common.yes')} noLabel={t('common.no')} /></dd>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('bic.testBic')}</dt>
                        <dd><BoolPill value={!!result.is_test_bic} trueClass="bg-warning-light text-warning" falseClass="bg-page text-ink-secondary" yesLabel={t('common.yes')} noLabel={t('common.no')} /></dd>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider" title={t('bic.passiveParticipantTooltip')}>{t('bic.passiveParticipant')}</dt>
                        <dd><BoolPill value={!!result.is_passive_participant} trueClass="bg-warning-light text-warning" falseClass="bg-page text-ink-secondary" yesLabel={t('common.yes')} noLabel={t('common.no')} /></dd>
                      </div>
                      <div className="flex justify-between items-center py-3">
                        <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider" title={t('bic.reverseBillingTooltip')}>{t('bic.reverseBilling')}</dt>
                        <dd><BoolPill value={!!result.is_reverse_billing} trueClass="bg-brand-light text-brand" falseClass="bg-page text-ink-secondary" yesLabel={t('common.yes')} noLabel={t('common.no')} /></dd>
                      </div>
                    </div>
                  </dl>
                  {leiEntity && (
                    <div className="border-t border-border mt-3 pt-3">
                      <div className="flex justify-between py-3 gap-4">
                        <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider shrink-0">{t('bic.lei')}</dt>
                        <dd className="text-sm text-ink font-mono break-all text-right min-w-0">{leiEntity.lei}</dd>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {leiEntity && <LEIEntityCard entity={leiEntity} />}
            </>
          ) : (
            <div className="console-panel overflow-hidden border-l-4 border-l-danger">
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-4 h-4 text-danger" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
                  <span className="text-sm font-semibold text-danger">{t('bic.invalidBic')}</span>
                </div>
                {data?.input && (
                  <div className="font-mono text-sm tracking-widest text-ink-secondary bg-page rounded-lg px-4 py-3 text-center mb-4">
                    {data.input}
                  </div>
                )}
                <p className="text-sm text-ink-secondary">{result.error}</p>
              </div>
            </div>
          )}
        </section>
      )}
    </>
  );
}