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
  const detailRowClass = 'flex justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0';
  const termClass = 'shrink-0 text-xs font-medium uppercase tracking-wider text-ink-muted';
  const valueClass = 'min-w-0 text-right text-sm text-ink';

  return (
    <>
      <section className="section-block">
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label htmlFor="iban-input" className="console-label">{t('iban.enterIban')}</label>
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
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isPending ? t('iban.checking') : t('iban.validate')}</span>
                </Button>
              </div>
            </form>
            <div className="helper-list mt-5">
              <div className="helper-row">
                <svg className="w-4 h-4 text-ink-muted" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                </svg>
                <span>{t('iban.helperText')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {result && (
        <section className="section-block" aria-live="polite" aria-label={t('a11y.validationResult')}>
          {result.valid ? (
            <>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="parser-card-header">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-success" />
                      <span className="text-sm font-semibold text-success">{t('iban.validIban')}</span>
                    </div>
                  </div>

                  <div className="parser-card-section">
                    <CodeOutput as="div" className="break-all text-center text-sm tracking-[0.2em] sm:text-base">
                      {result.iban_formatted || result.iban}
                    </CodeOutput>
                  </div>

                  <div className="parser-card-section">
                    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                      <div>
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('iban.country')}</dt>
                          <dd className={valueClass}>{result.country_name} ({result.country_code})</dd>
                        </div>
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('iban.checkDigits')}</dt>
                          <dd className={`${valueClass} font-mono`}>{result.check_digits}</dd>
                        </div>
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('iban.bban')}</dt>
                          <dd className={`${valueClass} break-all font-mono`}>{result.bban}</dd>
                        </div>
                      </div>
                      <div>
                        {result.bank_identifier && (
                          <div className={detailRowClass}>
                            <dt className={termClass}>{t('iban.bankIdentifier')}</dt>
                            <dd className={`${valueClass} font-mono`}>{result.bank_identifier}</dd>
                          </div>
                        )}
                        {result.branch_identifier && (
                          <div className={detailRowClass}>
                            <dt className={termClass}>{t('iban.branchIdentifier')}</dt>
                            <dd className={`${valueClass} font-mono`}>{result.branch_identifier}</dd>
                          </div>
                        )}
                        {result.account_number && (
                          <div className={detailRowClass}>
                            <dt className={termClass}>{t('iban.accountNumber')}</dt>
                            <dd className={`${valueClass} font-mono`}>{result.account_number}</dd>
                          </div>
                        )}
                      </div>
                    </dl>

                    {leiEntity && (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('iban.lei')}</dt>
                          <dd className={`${valueClass} break-all font-mono`}>{leiEntity.lei}</dd>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {leiEntity && <LEIEntityCard entity={leiEntity} />}

              {!leiEntity && leiSupported && result.bank_identifier && (
                <div className="console-notice mt-4">
                  <p className="flex items-center gap-2 text-sm leading-6 text-ink-secondary">
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" /></svg>
                    <span>{t('iban.noLeiRecord')} <span className="font-mono font-medium text-ink">{result.bank_identifier}</span></span>
                  </p>
                </div>
              )}
            </>
          ) : (
            <Card className="border-danger-border bg-danger-light/50">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ErrorCircleIcon className="h-4 w-4 text-danger" />
                  <span className="text-sm font-semibold text-danger">{t('iban.invalidIban')}</span>
                </div>
                {data?.input && (
                  <CodeOutput as="div" className="mb-4 break-all text-center text-sm tracking-[0.2em]">
                    {data.input}
                  </CodeOutput>
                )}
                <p className="text-sm leading-6 text-ink-secondary">{result.error}</p>
              </CardContent>
            </Card>
          )}
        </section>
      )}
    </>
  );
}
