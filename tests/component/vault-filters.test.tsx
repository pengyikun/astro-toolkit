// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react';
import VaultFilters from '../../components/vault/VaultFilters';
import { LocaleProvider } from '../../lib/i18n/client';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

const dict = {
  'common.partner': 'Partner',
  'common.environment': 'Environment',
  'common.search': 'Search',
  'accounts.applyFilters': 'Apply',
  'accounts.resetFilters': 'Reset',
  'vault.allPartners': 'All',
  'vault.allEnvironments': 'All env',
  'vault.sandbox': 'Sandbox',
  'vault.staging': 'Staging',
  'vault.uat': 'UAT',
  'search.placeholder': 'search…',
};

function renderFilters(initial: Record<string, string> = {}) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <VaultFilters partners={['StripeCo', 'AcmeCo']} initialFilters={initial} />
    </LocaleProvider>,
  );
}

beforeEach(() => pushMock.mockReset());
afterEach(() => cleanup());

describe('VaultFilters', () => {
  it('Apply with no filters navigates to /vault', () => {
    const { getByText } = renderFilters();
    act(() => (getByText('Apply') as HTMLButtonElement).click());
    expect(pushMock).toHaveBeenCalledWith('/vault');
  });

  it('Apply forwards search input value into the query string', () => {
    renderFilters();
    const searchInput = screen.getByPlaceholderText('search…') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'iban' } });
    act(() => (screen.getByText('Apply') as HTMLButtonElement).click());
    expect(pushMock).toHaveBeenCalledWith('/vault?search=iban');
  });

  it('Reset clears state and navigates to bare /vault', () => {
    const { getByText } = renderFilters({ search: 'old' });
    act(() => (getByText('Reset') as HTMLButtonElement).click());
    expect(pushMock).toHaveBeenCalledWith('/vault');
  });

  it('hides Reset when there are no active filters', () => {
    const { container } = renderFilters();
    expect(container.textContent).not.toContain('Reset');
  });

  it('shows Reset when initialFilters has values', () => {
    const { container } = renderFilters({ environment: 'sandbox' });
    expect(container.textContent).toContain('Reset');
  });
});
