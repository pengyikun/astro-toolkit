// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react';
import IbanChecker from '../../components/iban/IbanChecker';
import { LocaleProvider } from '../../lib/i18n/client';

const checkIBANMock = vi.fn();
vi.mock('../../actions/iban', () => ({
  checkIBAN: (...a: unknown[]) => checkIBANMock(...a),
}));

const dict = {
  'iban.enterIban': 'Enter IBAN',
  'iban.checking': 'Checking…',
  'iban.validate': 'Validate',
  'iban.structureVerified': 'Structure verified',
  'iban.invalidIban': 'Invalid IBAN',
  'iban.structure': 'Structure',
  'iban.country': 'Country',
  'iban.checkDigits': 'Check',
  'iban.bban': 'BBAN',
  'iban.routingExtract': 'Routing',
  'iban.bankIdentifier': 'Bank',
  'iban.branchIdentifier': 'Branch',
  'iban.accountNumber': 'Account',
  'iban.registryMatch': 'Registry',
  'iban.noLeiRecord': 'No LEI for',
  'common.example': 'e.g.',
  'placeholder.ibanSpaced': 'GB29 …',
  'a11y.validationResult': 'result',
};

function renderChecker() {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <IbanChecker />
    </LocaleProvider>,
  );
}

beforeEach(() => checkIBANMock.mockReset());
afterEach(() => cleanup());

describe('IbanChecker', () => {
  it('submitting blank input does not call action', async () => {
    renderChecker();
    const form = document.querySelector('form') as HTMLFormElement;
    await act(async () => {
      form.requestSubmit();
      await Promise.resolve();
    });
    expect(checkIBANMock).not.toHaveBeenCalled();
  });

  it('submits the input value through FormData under "iban" key', async () => {
    checkIBANMock.mockResolvedValueOnce({
      input: 'GB29NWBK60161331926819',
      result: { valid: false, error: 'fail' },
      leiSupported: false,
    });
    renderChecker();
    const input = screen.getByLabelText('Enter IBAN') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'GB29NWBK60161331926819' } });
    const form = input.closest('form') as HTMLFormElement;
    await act(async () => {
      form.requestSubmit();
      await Promise.resolve();
    });
    expect(checkIBANMock).toHaveBeenCalledTimes(1);
    const fd: FormData = checkIBANMock.mock.calls[0][0];
    expect(fd.get('iban')).toBe('GB29NWBK60161331926819');
  });

  it('renders structure-verified card on valid result', async () => {
    checkIBANMock.mockResolvedValueOnce({
      input: 'GB29',
      result: {
        valid: true,
        iban: 'GB29NWBK60161331926819',
        iban_formatted: 'GB29 NWBK 6016 1331 9268 19',
        country_name: 'United Kingdom',
        country_code: 'GB',
        check_digits: '29',
        bban: 'NWBK60161331926819',
        bank_identifier: 'NWBK',
        branch_identifier: '601613',
        account_number: '31926819',
      },
      leiSupported: false,
    });
    renderChecker();
    fireEvent.change(screen.getByLabelText('Enter IBAN'), { target: { value: 'GB29' } });
    await act(async () => {
      (document.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Structure verified');
    expect(document.body.textContent).toContain('United Kingdom');
  });

  it('renders error card on invalid result', async () => {
    checkIBANMock.mockResolvedValueOnce({
      input: 'XX',
      result: { valid: false, error: 'too short' },
      leiSupported: false,
    });
    renderChecker();
    fireEvent.change(screen.getByLabelText('Enter IBAN'), { target: { value: 'XX' } });
    await act(async () => {
      (document.querySelector('form') as HTMLFormElement).requestSubmit();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Invalid IBAN');
    expect(document.body.textContent).toContain('too short');
  });
});
