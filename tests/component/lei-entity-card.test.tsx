// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import LEIEntityCard from '../../components/ui/LEIEntityCard';
import { LocaleProvider } from '../../lib/i18n/client';
import type { LEIEntity } from '../../lib/lei-lookup';

const dict = {
  'lei.registryRecord': 'Registry record',
  'lei.entityInformation': 'Entity information',
  'lei.lei': 'LEI',
  'lei.jurisdiction': 'Jurisdiction',
  'lei.category': 'Category',
  'lei.legalForm': 'Legal form',
  'lei.registrationNumber': 'Registration number',
  'lei.registrationAuthority': 'Registration authority',
  'lei.addresses': 'Addresses',
  'lei.legalAddress': 'Legal address',
  'lei.headquartersAddress': 'HQ address',
  'lei.leiRegistration': 'LEI registration',
  'lei.registrationStatus': 'Status',
  'lei.initialRegistration': 'Initial registration',
  'lei.lastUpdated': 'Last updated',
  'lei.nextRenewal': 'Next renewal',
  'lei.managingLou': 'Managing LOU',
  'lei.corroboration': 'Corroboration',
  'lei.alsoKnownAs': 'Also known as {names}',
};

const baseAddr = {
  addressLines: ['1 Main St'],
  city: 'Berlin',
  region: 'BE',
  country: 'DE',
  postalCode: '10115',
};

const baseEntity: LEIEntity = {
  lei: '529900T8BM49AURSDO55',
  legalName: 'Acme GmbH',
  otherNames: ['Acme Group'],
  status: 'ACTIVE',
  jurisdiction: 'DE',
  category: 'GENERAL',
  legalForm: { id: '8888', other: '' },
  registeredAt: 'Bundesanzeiger',
  registeredAs: 'HRB 123456',
  creationDate: '2010-01-01',
  expirationDate: '',
  expirationReason: '',
  legalAddress: baseAddr,
  headquartersAddress: baseAddr,
  registration: {
    status: 'ISSUED',
    initialRegistrationDate: '2014-06-01',
    lastUpdateDate: '2024-01-15',
    nextRenewalDate: '2025-06-01',
    managingLou: '529900T8BM49AURSDO55',
    corroborationLevel: 'FULLY_CORROBORATED',
  },
};

function renderCard(entity = baseEntity, variant: 'card' | 'embedded' = 'card') {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <LEIEntityCard entity={entity} variant={variant} />
    </LocaleProvider>,
  );
}

afterEach(() => cleanup());

describe('LEIEntityCard', () => {
  it('renders core entity fields', () => {
    renderCard();
    expect(screen.getByText('Acme GmbH')).toBeTruthy();
    expect(screen.getAllByText('529900T8BM49AURSDO55').length).toBeGreaterThan(0);
    expect(screen.getByText('ACTIVE')).toBeTruthy();
    expect(screen.getByText('Registry record')).toBeTruthy();
  });

  it('shows other names when present', () => {
    renderCard();
    expect(screen.getByText('Also known as Acme Group')).toBeTruthy();
  });

  it('hides other names section when otherNames is empty', () => {
    renderCard({ ...baseEntity, otherNames: [] });
    expect(screen.queryByText(/Also known as/)).toBeNull();
  });

  it('omits Registry record header in embedded variant', () => {
    renderCard(baseEntity, 'embedded');
    expect(screen.queryByText('Registry record')).toBeNull();
    expect(screen.getByText('Acme GmbH')).toBeTruthy();
  });

  it('does not render duplicate HQ when same as legal address', () => {
    renderCard();
    // Only the legal address label should appear, not HQ
    expect(screen.getByText('Legal address')).toBeTruthy();
    expect(screen.queryByText('HQ address')).toBeNull();
  });

  it('renders HQ address when it differs from legal address', () => {
    const entity: LEIEntity = {
      ...baseEntity,
      headquartersAddress: { ...baseAddr, city: 'Hamburg' },
    };
    renderCard(entity);
    expect(screen.getByText('Legal address')).toBeTruthy();
    expect(screen.getByText('HQ address')).toBeTruthy();
  });

  it('shows neutral status badge for non-ACTIVE entities', () => {
    renderCard({ ...baseEntity, status: 'LAPSED' });
    expect(screen.getByText('LAPSED')).toBeTruthy();
  });

  it('formats category text', () => {
    renderCard({ ...baseEntity, category: 'BRANCH_OFFICE' });
    expect(screen.getByText('Branch office')).toBeTruthy();
  });
});
