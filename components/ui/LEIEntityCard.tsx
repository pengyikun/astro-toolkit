'use client';

import type { LEIEntity } from '@/lib/lei-lookup';
import Pill from '@/components/ui/Pill';
import { useLocale } from '@/lib/i18n/client';

function formatCategory(cat: string) {
  return cat.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function AddressBlock({ title, addr, t }: { title: string; addr: { addressLines: string[]; city: string; region: string; postalCode: string; country: string }; t: (key: string, values?: Record<string, string | number>) => string }) {
  const hasAddr = addr && (addr.addressLines.length > 0 || addr.city || addr.country);
  if (!hasAddr) return null;
  return (
    <div>
      <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider mb-1.5">{title}</dt>
      <dd className="text-sm text-ink space-y-0.5">
        {addr.addressLines.map((line, i) => <p key={i}>{line}</p>)}
        <p>{[addr.city, addr.region].filter(Boolean).join(', ')}{addr.postalCode ? ' ' + addr.postalCode : ''}</p>
        {addr.country && <p>{addr.country}</p>}
      </dd>
    </div>
  );
}

export default function LEIEntityCard({ entity }: { entity: LEIEntity }) {
  const { t, formatDate } = useLocale();
  const legalAddr = entity.legalAddress;
  const hqAddr = entity.headquartersAddress;
  const hasLegalAddr = legalAddr && (legalAddr.addressLines.length > 0 || legalAddr.city || legalAddr.country);
  const hasHqAddr = hqAddr && (hqAddr.addressLines.length > 0 || hqAddr.city || hqAddr.country);
  const hqDiffers = hasHqAddr && JSON.stringify(hqAddr) !== JSON.stringify(legalAddr);

  const fmtDate = (dateStr: string) =>
    formatDate(dateStr, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="console-panel overflow-hidden mt-4">
      <div className="px-6 pt-5 pb-2">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
          </svg>
          <h2 className="text-base font-semibold text-ink">{entity.legalName}</h2>
          <Pill active={entity.status === 'ACTIVE'} label={entity.status} />
        </div>
        {entity.otherNames && entity.otherNames.length > 0 && (
          <p className="text-xs text-ink-muted mt-1 ml-8">{t('lei.alsoKnownAs', { names: entity.otherNames.join(', ') })}</p>
        )}
      </div>

      <div className="px-6 py-4 border-t border-border">
        <h3 className="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-3">{t('lei.entityInformation')}</h3>
        <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
          <div className="space-y-0 divide-y divide-border">
            <div className="flex justify-between py-2.5 gap-4">
              <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider shrink-0">{t('lei.lei')}</dt>
              <dd className="text-sm text-ink font-mono break-all text-right min-w-0">{entity.lei}</dd>
            </div>
            {entity.jurisdiction && (
              <div className="flex justify-between py-2.5">
                <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('lei.jurisdiction')}</dt>
                <dd className="text-sm text-ink">{entity.jurisdiction}</dd>
              </div>
            )}
            {entity.category && (
              <div className="flex justify-between py-2.5">
                <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('lei.category')}</dt>
                <dd className="text-sm text-ink">{formatCategory(entity.category)}</dd>
              </div>
            )}
          </div>
          <div className="space-y-0 divide-y divide-border">
            {entity.legalForm && (entity.legalForm.id || entity.legalForm.other) && (
              <div className="flex justify-between py-2.5">
                <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('lei.legalForm')}</dt>
                <dd className="text-sm text-ink">{entity.legalForm.other || entity.legalForm.id}</dd>
              </div>
            )}
            {entity.registeredAs && (
              <div className="flex justify-between py-2.5 gap-4">
                <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider shrink-0">{t('lei.registrationNumber')}</dt>
                <dd className="text-sm text-ink font-mono break-all text-right min-w-0">{entity.registeredAs}</dd>
              </div>
            )}
            {entity.registeredAt && (
              <div className="flex justify-between py-2.5">
                <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('lei.registrationAuthority')}</dt>
                <dd className="text-sm text-ink">{entity.registeredAt}</dd>
              </div>
            )}
          </div>
        </dl>
      </div>

      {(hasLegalAddr || hqDiffers) && (
        <div className="px-6 py-4 border-t border-border">
          <h3 className="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-3">{t('lei.addresses')}</h3>
          <div className="grid grid-cols-1 gap-4 sm:gap-6 sm:grid-cols-2">
            {hasLegalAddr && <AddressBlock title={t('lei.legalAddress')} addr={legalAddr} t={t} />}
            {hqDiffers && <AddressBlock title={t('lei.headquartersAddress')} addr={hqAddr} t={t} />}
          </div>
        </div>
      )}

      {entity.registration && (
        <div className="px-6 py-4 border-t border-border">
          <h3 className="text-2xs font-semibold text-ink-muted uppercase tracking-wider mb-3">{t('lei.leiRegistration')}</h3>
          <dl className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <div className="space-y-0 divide-y divide-border">
              <div className="flex justify-between items-center py-2.5">
                <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('lei.registrationStatus')}</dt>
                <dd>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${entity.registration.status === 'ISSUED' ? 'bg-brand-light text-brand' : 'bg-warning-light text-warning'}`}>
                    {entity.registration.status}
                  </span>
                </dd>
              </div>
              {entity.registration.initialRegistrationDate && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('lei.initialRegistration')}</dt>
                  <dd className="text-sm text-ink">{fmtDate(entity.registration.initialRegistrationDate)}</dd>
                </div>
              )}
              {entity.registration.lastUpdateDate && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('lei.lastUpdated')}</dt>
                  <dd className="text-sm text-ink">{fmtDate(entity.registration.lastUpdateDate)}</dd>
                </div>
              )}
            </div>
            <div className="space-y-0 divide-y divide-border">
              {entity.registration.nextRenewalDate && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('lei.nextRenewal')}</dt>
                  <dd className="text-sm text-ink">{fmtDate(entity.registration.nextRenewalDate)}</dd>
                </div>
              )}
              {entity.registration.managingLou && (
                <div className="flex justify-between py-2.5 gap-4">
                  <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider shrink-0">{t('lei.managingLou')}</dt>
                  <dd className="text-sm text-ink font-mono text-xs break-all text-right min-w-0">{entity.registration.managingLou}</dd>
                </div>
              )}
              {entity.registration.corroborationLevel && (
                <div className="flex justify-between py-2.5">
                  <dt className="text-xs font-medium text-ink-muted uppercase tracking-wider">{t('lei.corroboration')}</dt>
                  <dd className="text-sm text-ink">{formatCategory(entity.registration.corroborationLevel)}</dd>
                </div>
              )}
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
