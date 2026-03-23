'use client';

import type { LEIEntity } from '@/lib/lei-lookup';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DetailItem, DetailMetadata } from '@/components/ui/detail-card';
import { useLocale } from '@/lib/i18n/client';

function formatCategory(cat: string) {
  return cat.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function AddressBlock({ title, addr, t }: { title: string; addr: { addressLines: string[]; city: string; region: string; postalCode: string; country: string }; t: (key: string, values?: Record<string, string | number>) => string }) {
  const hasAddr = addr && (addr.addressLines.length > 0 || addr.city || addr.country);
  if (!hasAddr) return null;
  return (
    <DetailItem
      label={title}
      value={
        <>
        {addr.addressLines.map((line, i) => <p key={i}>{line}</p>)}
        <p>{[addr.city, addr.region].filter(Boolean).join(', ')}{addr.postalCode ? ' ' + addr.postalCode : ''}</p>
        {addr.country && <p>{addr.country}</p>}
        </>
      }
      valueClassName="space-y-0.5"
    />
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

  const registrationTone = entity.registration?.status === 'ISSUED' ? 'brand' : 'warning';

  return (
    <Card className="overflow-hidden mt-4">
      <div className="px-6 pb-4 pt-5">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <svg className="h-5 w-5 shrink-0 text-brand" fill="none" viewBox="0 0 24 24" strokeWidth="1.75" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
          </svg>
          <h2 className="min-w-0 text-base font-semibold text-ink" dir="auto">{entity.legalName}</h2>
          <Badge variant={entity.status === 'ACTIVE' ? 'success' : 'neutral'} className="text-[0.8rem]">
            {entity.status}
          </Badge>
        </div>
        {entity.otherNames && entity.otherNames.length > 0 && (
          <p className="mt-2 text-sm leading-6 text-ink-secondary" dir="auto">
            {t('lei.alsoKnownAs', { names: entity.otherNames.join(', ') })}
          </p>
        )}
      </div>

      <div className="border-t border-border px-6 py-5">
        <h3 className="detail-section-title">{t('lei.entityInformation')}</h3>
        <DetailMetadata>
          <DetailItem label={t('lei.lei')} value={entity.lei} valueClassName="font-mono break-all" />
          {entity.jurisdiction && (
            <DetailItem label={t('lei.jurisdiction')} value={entity.jurisdiction} />
          )}
          {entity.category && (
            <DetailItem label={t('lei.category')} value={formatCategory(entity.category)} />
          )}
          {entity.legalForm && (entity.legalForm.id || entity.legalForm.other) && (
            <DetailItem label={t('lei.legalForm')} value={entity.legalForm.other || entity.legalForm.id} />
          )}
          {entity.registeredAs && (
            <DetailItem label={t('lei.registrationNumber')} value={entity.registeredAs} valueClassName="font-mono break-all" />
          )}
          {entity.registeredAt && (
            <DetailItem label={t('lei.registrationAuthority')} value={entity.registeredAt} />
          )}
        </DetailMetadata>
      </div>

      {(hasLegalAddr || hqDiffers) && (
        <div className="border-t border-border px-6 py-5">
          <h3 className="detail-section-title">{t('lei.addresses')}</h3>
          <DetailMetadata>
            {hasLegalAddr && <AddressBlock title={t('lei.legalAddress')} addr={legalAddr} t={t} />}
            {hqDiffers && <AddressBlock title={t('lei.headquartersAddress')} addr={hqAddr} t={t} />}
          </DetailMetadata>
        </div>
      )}

      {entity.registration && (
        <div className="border-t border-border px-6 py-5">
          <h3 className="detail-section-title">{t('lei.leiRegistration')}</h3>
          <DetailMetadata>
            <DetailItem
              label={t('lei.registrationStatus')}
              value={<Badge variant={registrationTone} className="text-[0.8rem]">{entity.registration.status}</Badge>}
            />
            {entity.registration.initialRegistrationDate && (
              <DetailItem label={t('lei.initialRegistration')} value={fmtDate(entity.registration.initialRegistrationDate)} />
            )}
            {entity.registration.lastUpdateDate && (
              <DetailItem label={t('lei.lastUpdated')} value={fmtDate(entity.registration.lastUpdateDate)} />
            )}
            {entity.registration.nextRenewalDate && (
              <DetailItem label={t('lei.nextRenewal')} value={fmtDate(entity.registration.nextRenewalDate)} />
            )}
            {entity.registration.managingLou && (
              <DetailItem label={t('lei.managingLou')} value={entity.registration.managingLou} valueClassName="font-mono break-all" />
            )}
            {entity.registration.corroborationLevel && (
              <DetailItem label={t('lei.corroboration')} value={formatCategory(entity.registration.corroborationLevel)} />
            )}
          </DetailMetadata>
        </div>
      )}
    </Card>
  );
}
