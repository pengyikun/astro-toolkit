// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import AccountFilters from '../../components/accounts/AccountFilters';
import { LocaleProvider } from '../../lib/i18n/client';

const pushMock = vi.fn();
const searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  useSearchParams: () => ({ get: (k: string) => searchParams.get(k) }),
}));

const dict = {
  'common.region': 'Region',
  'common.status': 'Status',
  'accounts.allRegions': 'All regions',
  'accounts.allStatuses': 'All',
  'accounts.active': 'Active',
  'accounts.archived': 'Archived',
  'accounts.accountType': 'Type',
  'accounts.mockAndReal': 'Both',
  'accounts.mock': 'Mock',
  'accounts.real': 'Real',
  'accounts.applyFilters': 'Apply',
  'accounts.resetFilters': 'Reset',
};

const regions = [{ code: 'EU', name: 'Europe' }, { code: 'US', name: 'United States' }];

function renderFilters(initial: Record<string, string> = {}) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <AccountFilters regions={regions} initialFilters={initial} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  pushMock.mockReset();
  searchParams.delete('search');
});

afterEach(() => cleanup());

describe('AccountFilters', () => {
  it('hides Reset button when no filters are set', () => {
    const { container } = renderFilters();
    expect(container.textContent).toContain('Apply');
    // Reset is conditional on hasFilters
    expect(container.textContent).not.toContain('Reset');
  });

  it('shows Reset button when initial filters are present', () => {
    const { container } = renderFilters({ region_code: 'EU' });
    expect(container.textContent).toContain('Reset');
  });

  it('Apply with no values navigates to bare /accounts', () => {
    const { getByText } = renderFilters();
    act(() => (getByText('Apply') as HTMLButtonElement).click());
    expect(pushMock).toHaveBeenCalledWith('/accounts');
  });

  it('Apply preserves the existing ?search= param', () => {
    searchParams.set('search', 'foo');
    const { getByText } = renderFilters({ region_code: 'EU' });
    act(() => (getByText('Apply') as HTMLButtonElement).click());
    expect(pushMock).toHaveBeenCalledWith('/accounts?region_code=EU&search=foo');
  });

  it('Apply propagates pre-filled filters', () => {
    const { getByText } = renderFilters({ region_code: 'US', status: 'active', account_type: 'real' });
    act(() => (getByText('Apply') as HTMLButtonElement).click());
    const url = pushMock.mock.calls[0][0] as string;
    expect(url).toContain('region_code=US');
    expect(url).toContain('status=active');
    expect(url).toContain('account_type=real');
  });

  it('Reset navigates to /accounts and clears state', () => {
    const { getByText } = renderFilters({ region_code: 'EU' });
    act(() => (getByText('Reset') as HTMLButtonElement).click());
    expect(pushMock).toHaveBeenCalledWith('/accounts');
  });
});
