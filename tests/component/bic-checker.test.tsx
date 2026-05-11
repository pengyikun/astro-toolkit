// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react';
import BicChecker from '../../components/bic/BicChecker';
import { LocaleProvider } from '../../lib/i18n/client';

const checkBICMock = vi.fn();
vi.mock('../../actions/bic', () => ({
  checkBIC: (...a: unknown[]) => checkBICMock(...a),
}));

const dict = {
  'bic.enterBic': 'Enter BIC',
  'bic.checking': 'Checking…',
  'bic.validate': 'Validate',
  'bic.swiftIdentityVerified': 'SWIFT identity verified',
  'bic.invalidBic': 'Invalid BIC',
  'bic.identity': 'Identity',
  'bic.institutionCode': 'Institution',
  'bic.country': 'Country',
  'bic.locationCode': 'Location',
  'bic.branchCode': 'Branch',
  'bic.naBranchCode': 'n/a',
  'bic.networkProfile': 'Network',
  'bic.primaryOffice': 'Primary',
  'bic.primaryOfficeDescription': 'd',
  'bic.testBic': 'Test BIC',
  'bic.testBicDescription': 'd',
  'bic.passiveParticipant': 'Passive',
  'bic.passiveParticipantDescription': 'd',
  'bic.reverseBilling': 'Reverse',
  'bic.reverseBillingDescription': 'd',
  'bic.registryMatch': 'Registry',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.example': 'e.g.',
  'placeholder.bicExample': 'DEUT…',
  'a11y.validationResult': 'result',
};

function renderChecker() {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <BicChecker />
    </LocaleProvider>,
  );
}

beforeEach(() => checkBICMock.mockReset());
afterEach(() => cleanup());

describe('BicChecker', () => {
  it('blank submit is a no-op', async () => {
    renderChecker();
    await act(async () => {
      (document.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
    });
    expect(checkBICMock).not.toHaveBeenCalled();
  });

  it('submits the BIC under "bic" key', async () => {
    checkBICMock.mockResolvedValueOnce({
      input: 'DEUTDEFF',
      result: { valid: false, error: 'bad' },
    });
    renderChecker();
    fireEvent.change(screen.getByLabelText('Enter BIC'), { target: { value: 'DEUTDEFF' } });
    await act(async () => {
      (document.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
    });
    const fd: FormData = checkBICMock.mock.calls[0][0];
    expect(fd.get('bic')).toBe('DEUTDEFF');
  });

  it('renders identity card on valid result with Yes/No badges for flags', async () => {
    checkBICMock.mockResolvedValueOnce({
      input: 'DEUTDEFF500',
      result: {
        valid: true,
        bic: 'DEUTDEFF500',
        institution_code: 'DEUT',
        country_name: 'Germany',
        country_code: 'DE',
        location_code: 'FF',
        branch_code: '500',
        is_primary_office: false,
        is_test_bic: false,
        is_passive_participant: true,
        is_reverse_billing: false,
      },
    });
    renderChecker();
    fireEvent.change(screen.getByLabelText('Enter BIC'), { target: { value: 'DEUTDEFF500' } });
    await act(async () => {
      (document.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('SWIFT identity verified');
    expect(document.body.textContent).toContain('Germany');
    // Both Yes and No should be present given mixed flags
    expect(document.body.textContent).toMatch(/Yes/);
    expect(document.body.textContent).toMatch(/No/);
  });

  it('renders invalid card on failure', async () => {
    checkBICMock.mockResolvedValueOnce({
      input: 'XYZ',
      result: { valid: false, error: 'wrong' },
    });
    renderChecker();
    fireEvent.change(screen.getByLabelText('Enter BIC'), { target: { value: 'XYZ' } });
    await act(async () => {
      (document.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Invalid BIC');
    expect(document.body.textContent).toContain('wrong');
  });
});
