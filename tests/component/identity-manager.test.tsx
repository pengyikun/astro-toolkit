// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react';
import IdentityManager from '../../components/intelligence/IdentityManager';
import { LocaleProvider } from '../../lib/i18n/client';
import type { IdentityAlias } from '../../types';

const addIdentityEntryMock = vi.fn();
const removeIdentityEntryMock = vi.fn();
const getIdentityEntriesMock = vi.fn();

vi.mock('../../actions/intelligence', () => ({
  addIdentityEntry: (...a: unknown[]) => addIdentityEntryMock(...a),
  removeIdentityEntry: (...a: unknown[]) => removeIdentityEntryMock(...a),
  getIdentityEntries: (...a: unknown[]) => getIdentityEntriesMock(...a),
}));

const dict = {
  'intelligence.sectionName': 'Name',
  'intelligence.sectionEmail': 'Email',
  'intelligence.sectionPhone': 'Phone',
  'intelligence.sectionCompany': 'Company',
  'intelligence.sectionColleague': 'Colleague',
  'intelligence.sectionNameDesc': 'd',
  'intelligence.sectionEmailDesc': 'd',
  'intelligence.sectionPhoneDesc': 'd',
  'intelligence.sectionCompanyDesc': 'd',
  'intelligence.sectionColleagueDesc': 'd',
  'intelligence.namePlaceholder': 'name',
  'intelligence.emailEntryPlaceholder': 'email',
  'intelligence.phoneEntryPlaceholder': 'phone',
  'intelligence.companyEntryPlaceholder': 'company',
  'intelligence.colleagueEntryPlaceholder': 'colleague',
  'intelligence.addEntry': 'Add',
};

function makeAlias(id: number, field: IdentityAlias['field'], value: string): IdentityAlias {
  return { id, profile_id: 1, field, alias_value: value, created_at: '2025' } as IdentityAlias;
}

function renderManager(initial: IdentityAlias[] = []) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <IdentityManager initialEntries={initial} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  addIdentityEntryMock.mockReset();
  removeIdentityEntryMock.mockReset();
  getIdentityEntriesMock.mockReset();
});

afterEach(() => cleanup());

describe('IdentityManager', () => {
  it('renders a row per FIELD_CONFIG', () => {
    renderManager();
    expect(screen.getAllByText('Name').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Email').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Phone').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Company').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Colleague').length).toBeGreaterThan(0);
  });

  it('renders existing entries as chips', () => {
    renderManager([makeAlias(1, 'email', 'a@b.co')]);
    expect(document.body.textContent).toContain('a@b.co');
  });

  it('Add button is disabled while input is empty', () => {
    renderManager();
    const addBtns = screen.getAllByText('Add') as HTMLButtonElement[];
    for (const b of addBtns) expect(b.disabled).toBe(true);
  });

  it('submitting an add form posts FormData with field + alias_value', async () => {
    addIdentityEntryMock.mockResolvedValueOnce({ success: true });
    getIdentityEntriesMock.mockResolvedValueOnce({ hasProfile: true, entries: [] });
    renderManager();

    // First field row corresponds to 'name'
    const inputs = document.querySelectorAll('input.console-input') as NodeListOf<HTMLInputElement>;
    const nameInput = inputs[0];
    fireEvent.change(nameInput, { target: { value: 'Alvin' } });

    const form = nameInput.closest('form') as HTMLFormElement;
    await act(async () => {
      form.requestSubmit();
      await Promise.resolve();
    });

    expect(addIdentityEntryMock).toHaveBeenCalledTimes(1);
    const fd: FormData = addIdentityEntryMock.mock.calls[0][0];
    expect(fd.get('field')).toBe('name');
    expect(fd.get('alias_value')).toBe('Alvin');
  });

  it('does not submit when input is whitespace-only', async () => {
    renderManager();
    const inputs = document.querySelectorAll('input.console-input') as NodeListOf<HTMLInputElement>;
    fireEvent.change(inputs[0], { target: { value: '   ' } });
    const form = inputs[0].closest('form') as HTMLFormElement;
    await act(async () => {
      form.requestSubmit();
      await Promise.resolve();
    });
    expect(addIdentityEntryMock).not.toHaveBeenCalled();
  });

  it('clicking the chip ✕ removes entry through removeIdentityEntry', async () => {
    removeIdentityEntryMock.mockResolvedValueOnce(undefined);
    getIdentityEntriesMock.mockResolvedValueOnce({ hasProfile: true, entries: [] });
    renderManager([makeAlias(42, 'email', 'a@b.co')]);

    const removeBtn = screen.getByLabelText('Remove a@b.co');
    await act(async () => {
      removeBtn.click();
      await Promise.resolve();
    });
    expect(removeIdentityEntryMock).toHaveBeenCalledTimes(1);
    const fd: FormData = removeIdentityEntryMock.mock.calls[0][0];
    expect(fd.get('id')).toBe('42');
  });
});
