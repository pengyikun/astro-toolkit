'use client';

import { useState, useTransition } from 'react';
import { checkBIC, type BICCheckResult } from '@/actions/bic';
import LEIEntityCard from '@/components/ui/LEIEntityCard';
import { CheckCircleIcon, ErrorCircleIcon } from '@/components/ui/Icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { CodeOutput } from '@/components/ui/code-output';
import { useLocale } from '@/lib/i18n/client';

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
  const detailRowClass = 'flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0';
  const termClass = 'shrink-0 text-xs font-medium uppercase tracking-wider text-ink-muted';
  const valueClass = 'min-w-0 text-right text-sm text-ink';
  const renderBooleanBadge = (active: boolean, activeVariant: 'success' | 'warning' | 'brand' = 'success') => (
    <Badge variant={active ? activeVariant : 'neutral'}>
      {active ? t('common.yes') : t('common.no')}
    </Badge>
  );

  return (
    <>
      <section className="section-block">
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label htmlFor="bic-input" className="console-label">{t('bic.enterBic')}</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="text"
                  id="bic-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('placeholder.bicExample')}
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
                  <span>{isPending ? t('bic.checking') : t('bic.validate')}</span>
                </Button>
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
                      <span className="text-sm font-semibold text-success">{t('bic.validBic')}</span>
                    </div>
                  </div>

                  <div className="parser-card-section">
                    <CodeOutput as="div" className="text-center text-base tracking-[0.22em] sm:text-lg">
                      {result.bic}
                    </CodeOutput>
                  </div>

                  <div className="parser-card-section">
                    <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                      <div>
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('bic.institutionCode')}</dt>
                          <dd className={`${valueClass} font-mono`}>{result.institution_code}</dd>
                        </div>
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('bic.country')}</dt>
                          <dd className={valueClass}>{result.country_name} ({result.country_code})</dd>
                        </div>
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('bic.locationCode')}</dt>
                          <dd className={`${valueClass} font-mono`}>{result.location_code}</dd>
                        </div>
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('bic.branchCode')}</dt>
                          <dd className={`${valueClass} font-mono`}>{result.branch_code || t('bic.naBranchCode')}</dd>
                        </div>
                      </div>
                      <div>
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('bic.primaryOffice')}</dt>
                          <dd>{renderBooleanBadge(!!result.is_primary_office)}</dd>
                        </div>
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('bic.testBic')}</dt>
                          <dd>{renderBooleanBadge(!!result.is_test_bic, 'warning')}</dd>
                        </div>
                        <div className={detailRowClass}>
                          <dt className={termClass} title={t('bic.passiveParticipantTooltip')}>{t('bic.passiveParticipant')}</dt>
                          <dd>{renderBooleanBadge(!!result.is_passive_participant, 'warning')}</dd>
                        </div>
                        <div className={detailRowClass}>
                          <dt className={termClass} title={t('bic.reverseBillingTooltip')}>{t('bic.reverseBilling')}</dt>
                          <dd>{renderBooleanBadge(!!result.is_reverse_billing, 'brand')}</dd>
                        </div>
                      </div>
                    </dl>

                    {leiEntity && (
                      <div className="mt-3 border-t border-border pt-3">
                        <div className={detailRowClass}>
                          <dt className={termClass}>{t('bic.lei')}</dt>
                          <dd className={`${valueClass} break-all font-mono`}>{leiEntity.lei}</dd>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              {leiEntity && <LEIEntityCard entity={leiEntity} />}
            </>
          ) : (
            <Card className="border-danger-border bg-danger-light/50">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ErrorCircleIcon className="h-4 w-4 text-danger" />
                  <span className="text-sm font-semibold text-danger">{t('bic.invalidBic')}</span>
                </div>
                {data?.input && (
                  <CodeOutput as="div" className="mb-4 text-center text-sm tracking-[0.22em]">
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
