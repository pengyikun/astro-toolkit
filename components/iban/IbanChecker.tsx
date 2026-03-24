'use client';

import { useState, useTransition } from 'react';
import { checkIBAN, type IBANCheckResult } from '@/actions/iban';
import LEIEntityCard from '@/components/ui/LEIEntityCard';
import { CheckCircleIcon, ErrorCircleIcon } from '@/components/ui/Icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { CodeOutput } from '@/components/ui/code-output';
import { useLocale } from '@/lib/i18n/client';

export default function IbanChecker() {
  const { t } = useLocale();
  const [input, setInput] = useState('');
  const [data, setData] = useState<IBANCheckResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    const formData = new FormData();
    formData.set('iban', input);
    startTransition(async () => {
      const result = await checkIBAN(formData);
      setData(result);
    });
  };

  const result = data?.result;
  const leiEntity = data?.leiEntity;
  const leiSupported = data?.leiSupported ?? false;
  const formattedIban = result?.iban_formatted || result?.iban || data?.input || input;
  const resultKey = `${result?.valid ? 'valid' : 'invalid'}-${formattedIban}`;

  return (
    <>
      <section className="section-block">
        <Card className="validator-shell">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="validator-form">
              <div className="validator-form-head">
                <label htmlFor="iban-input" className="console-label">{t('iban.enterIban')}</label>
                <div className="validator-sample">
                  <span>{t('common.example')}</span>
                  <code>GB29 NWBK 6016 1331 9268 19</code>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="text"
                  id="iban-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('placeholder.ibanSpaced')}
                  autoComplete="off"
                  className="flex-1 font-mono text-base tracking-[0.16em]"
                />
                <Button
                  type="submit"
                  disabled={isPending}
                  aria-busy={isPending}
                  className={`whitespace-nowrap sm:min-w-[8rem] flex items-center justify-center gap-2 ${isPending ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isPending && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isPending ? t('iban.checking') : t('iban.validate')}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {result && (
        <section className="section-block" aria-live="polite" aria-label={t('a11y.validationResult')}>
          {result.valid ? (
            <Card
              key={resultKey}
              className="validator-result-shell animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
            >
              <CardContent className="p-0">
                <div className="validator-result-head">
                  <div className="space-y-3">
                    <div className="validator-status is-valid">
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>{t('iban.structureVerified')}</span>
                    </div>
                    <CodeOutput as="div" className="validator-code-band break-all text-center text-sm tracking-[0.2em] sm:text-base">
                      {formattedIban}
                    </CodeOutput>
                  </div>
                </div>

                <div className="validator-section-grid">
                  <div className="validator-section">
                    <h3 className="validator-section-title">{t('iban.structure')}</h3>
                    <dl className="validator-meta-list">
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('iban.country')}</dt>
                        <dd className="validator-meta-value">{result.country_name} ({result.country_code})</dd>
                      </div>
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('iban.checkDigits')}</dt>
                        <dd className="validator-meta-value font-mono">{result.check_digits}</dd>
                      </div>
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('iban.bban')}</dt>
                        <dd className="validator-meta-value font-mono">{result.bban}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="validator-section">
                    <h3 className="validator-section-title">{t('iban.routingExtract')}</h3>
                    <dl className="validator-meta-list">
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('iban.bankIdentifier')}</dt>
                        <dd className="validator-meta-value font-mono">{result.bank_identifier || '\u2014'}</dd>
                      </div>
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('iban.branchIdentifier')}</dt>
                        <dd className="validator-meta-value font-mono">{result.branch_identifier || '\u2014'}</dd>
                      </div>
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('iban.accountNumber')}</dt>
                        <dd className="validator-meta-value font-mono">{result.account_number || '\u2014'}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {(leiEntity || (leiSupported && result.bank_identifier)) && (
                  <div className="validator-enrichment">
                    <h3 className="validator-section-title">{t('iban.registryMatch')}</h3>
                    {leiEntity ? (
                      <LEIEntityCard entity={leiEntity} variant="embedded" />
                    ) : (
                      <p className="validator-inline-notice">
                        {t('iban.noLeiRecord')} <span className="font-mono font-medium text-ink">{result.bank_identifier}</span>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card
              key={resultKey}
              className="validator-result-shell is-invalid animate-in fade-in-0 slide-in-from-bottom-2 duration-300"
            >
              <CardContent className="p-0">
                <div className="validator-result-head">
                  <div className="space-y-3">
                    <div className="validator-status is-invalid">
                      <ErrorCircleIcon className="h-4 w-4" />
                      <span>{t('iban.invalidIban')}</span>
                    </div>
                    {data?.input && (
                      <CodeOutput as="div" className="validator-code-band break-all text-center text-sm tracking-[0.2em]">
                        {data.input}
                      </CodeOutput>
                    )}
                  </div>
                </div>
                <div className="validator-section">
                  <p className="validator-inline-notice">{result.error}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </>
  );
}
