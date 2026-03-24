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
  const formattedBic = result?.bic || data?.input || input;
  const resultKey = `${result?.valid ? 'valid' : 'invalid'}-${formattedBic}`;

  const renderBooleanBadge = (active: boolean, activeVariant: 'success' | 'warning' | 'brand' = 'success') => (
    <Badge variant={active ? activeVariant : 'neutral'}>
      {active ? t('common.yes') : t('common.no')}
    </Badge>
  );

  return (
    <>
      <section className="section-block">
        <Card className="validator-shell">
          <CardContent className="p-0">
            <form onSubmit={handleSubmit} className="validator-form">
              <div className="validator-form-head">
                <label htmlFor="bic-input" className="console-label">{t('bic.enterBic')}</label>
                <div className="validator-sample">
                  <span>{t('common.example')}</span>
                  <code>DEUTDEFF500</code>
                </div>
              </div>
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
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  <span>{isPending ? t('bic.checking') : t('bic.validate')}</span>
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
                      <span>{t('bic.swiftIdentityVerified')}</span>
                    </div>
                    <CodeOutput as="div" className="validator-code-band text-left text-base tracking-[0.22em] sm:text-lg">
                      {formattedBic}
                    </CodeOutput>
                  </div>
                </div>

                <div className="validator-section-grid">
                  <div className="validator-section">
                    <h3 className="validator-section-title">{t('bic.identity')}</h3>
                    <dl className="validator-meta-list">
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('bic.institutionCode')}</dt>
                        <dd className="validator-meta-value font-mono">{result.institution_code}</dd>
                      </div>
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('bic.country')}</dt>
                        <dd className="validator-meta-value">{result.country_name} ({result.country_code})</dd>
                      </div>
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('bic.locationCode')}</dt>
                        <dd className="validator-meta-value font-mono">{result.location_code}</dd>
                      </div>
                      <div className="validator-meta-row">
                        <dt className="validator-meta-term">{t('bic.branchCode')}</dt>
                        <dd className="validator-meta-value font-mono">{result.branch_code || t('bic.naBranchCode')}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="validator-section">
                    <h3 className="validator-section-title">{t('bic.networkProfile')}</h3>
                    <div className="validator-flag-grid">
                      <div className="validator-flag">
                        <div className="validator-flag-copy">
                          <span className="validator-flag-label">{t('bic.primaryOffice')}</span>
                          <p className="validator-flag-detail">{t('bic.primaryOfficeDescription')}</p>
                        </div>
                        {renderBooleanBadge(!!result.is_primary_office)}
                      </div>
                      <div className="validator-flag">
                        <div className="validator-flag-copy">
                          <span className="validator-flag-label">{t('bic.testBic')}</span>
                          <p className="validator-flag-detail">{t('bic.testBicDescription')}</p>
                        </div>
                        {renderBooleanBadge(!!result.is_test_bic, 'warning')}
                      </div>
                      <div className="validator-flag">
                        <div className="validator-flag-copy">
                          <span className="validator-flag-label">{t('bic.passiveParticipant')}</span>
                          <p className="validator-flag-detail">{t('bic.passiveParticipantDescription')}</p>
                        </div>
                        {renderBooleanBadge(!!result.is_passive_participant, 'warning')}
                      </div>
                      <div className="validator-flag">
                        <div className="validator-flag-copy">
                          <span className="validator-flag-label">{t('bic.reverseBilling')}</span>
                          <p className="validator-flag-detail">{t('bic.reverseBillingDescription')}</p>
                        </div>
                        {renderBooleanBadge(!!result.is_reverse_billing, 'brand')}
                      </div>
                    </div>
                  </div>
                </div>

                {leiEntity && (
                  <div className="validator-enrichment">
                    <h3 className="validator-section-title">{t('bic.registryMatch')}</h3>
                    <LEIEntityCard entity={leiEntity} variant="embedded" />
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
                      <span>{t('bic.invalidBic')}</span>
                    </div>
                    {data?.input && (
                      <CodeOutput as="div" className="validator-code-band text-left text-sm tracking-[0.22em]">
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
