// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent, screen } from '@testing-library/react';
import LogFilters from '../../components/penny-log/LogFilters';
import { LocaleProvider } from '../../lib/i18n/client';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const dict = {
  'common.status': 'Status',
  'common.direction': 'Direction',
  'common.partner': 'Partner',
  'common.search': 'Search',
  'common.clear': 'Clear',
  'transactions.allStatuses': 'All statuses',
  'transactions.pending': 'Pending',
  'transactions.success': 'Success',
  'transactions.failed': 'Failed',
  'transactions.timeout': 'Timeout',
  'transactions.returned': 'Returned',
  'transactions.inboundAndOutbound': 'In & Out',
  'transactions.inbound': 'Inbound',
  'transactions.outbound': 'Outbound',
  'transactions.partnerName': 'Partner name',
  'transactions.from': 'From',
  'transactions.to': 'To',
  'transactions.searchPlaceholder': 'Search...',
  'accounts.resetFilters': 'Reset',
  'accounts.applyFilters': 'Apply',
};

function renderFilters(initial: Record<string, string> = {}) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <LogFilters initialFilters={initial} />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  push.mockReset();
});

afterEach(() => cleanup());

describe('LogFilters', () => {
  it('renders without filters and Apply navigates to base path', () => {
    renderFilters();
    act(() => {
      screen.getByText('Apply').click();
    });
    expect(push).toHaveBeenCalledWith('/transactions');
  });

  it('reflects initial filters in inputs', () => {
    renderFilters({
      partner_name: 'ACME',
      date_from: '2025-01-01',
      date_to: '2025-12-31',
      search: 'invoice',
    });
    expect((screen.getByLabelText('Partner') as HTMLInputElement).value).toBe('ACME');
    expect((screen.getByLabelText('From') as HTMLInputElement).value).toBe('2025-01-01');
    expect((screen.getByLabelText('To') as HTMLInputElement).value).toBe('2025-12-31');
    expect((screen.getByLabelText('Search') as HTMLInputElement).value).toBe('invoice');
  });

  it('Apply builds query string from filled fields', () => {
    renderFilters();
    fireEvent.change(screen.getByLabelText('Partner'), { target: { value: 'Bob' } });
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2025-02-01' } });
    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'ref' } });

    act(() => {
      screen.getByText('Apply').click();
    });

    const url = push.mock.calls[0][0] as string;
    expect(url.startsWith('/transactions?')).toBe(true);
    expect(url).toContain('partner_name=Bob');
    expect(url).toContain('date_from=2025-02-01');
    expect(url).toContain('search=ref');
  });

  it('Reset clears every input and navigates to base path', () => {
    renderFilters({ partner_name: 'ACME', search: 'foo' });
    expect((screen.getByLabelText('Partner') as HTMLInputElement).value).toBe('ACME');

    act(() => {
      screen.getByText('Reset').click();
    });

    expect((screen.getByLabelText('Partner') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Search') as HTMLInputElement).value).toBe('');
    expect(push).toHaveBeenCalledWith('/transactions');
  });

  it('shows Clear button only when filters are active', () => {
    const { unmount } = renderFilters();
    expect(screen.queryByText('Clear')).toBeNull();
    unmount();

    renderFilters({ search: 'x' });
    expect(screen.queryByText('Clear')).toBeTruthy();
  });
});
