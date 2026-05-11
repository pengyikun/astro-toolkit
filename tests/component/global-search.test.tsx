// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, screen, fireEvent } from '@testing-library/react';
import GlobalSearch from '../../components/layout/GlobalSearch';
import { LocaleProvider } from '../../lib/i18n/client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) =>
    <a href={href} {...rest}>{children}</a>,
}));

const dict = {
  'search.label': 'Search',
  'search.placeholder': 'Search…',
  'search.results': 'Results',
  'search.searching': 'Searching',
  'search.accounts': 'Accounts',
  'search.credentials': 'Credentials',
  'search.transactions': 'Transactions',
  'common.noResults': 'No results',
  'parser.unexpectedError': 'Unexpected error',
};

function renderSearch() {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <GlobalSearch />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  // @ts-expect-error - test stub
  global.fetch = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function getInput() {
  return screen.getByRole('combobox') as HTMLInputElement;
}

function setInput(v: string) {
  const input = getInput();
  fireEvent.change(input, { target: { value: v } });
}

describe('GlobalSearch', () => {
  it('renders an empty search input with no listbox open', () => {
    renderSearch();
    const input = getInput();
    expect(input).toBeTruthy();
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('does not query the API when input is shorter than 2 characters', async () => {
    renderSearch();
    act(() => setInput('a'));
    act(() => vi.advanceTimersByTime(400));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('debounces queries by 300ms', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ query: 'ab', results: { accounts: [], credentials: [], transactions: [] }, total: 0 }),
    });
    renderSearch();

    act(() => setInput('ab'));
    expect(global.fetch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(299));
    expect(global.fetch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain('q=ab');
  });

  it('aborts an in-flight request when the user types again', async () => {
    let firstAbort: AbortSignal | undefined;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce((_url, init) => {
      firstAbort = init?.signal;
      return new Promise(() => {}); // never resolves
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(() => new Promise(() => {}));

    renderSearch();
    await act(async () => {
      setInput('ab');
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(firstAbort?.aborted).toBe(false);

    await act(async () => {
      setInput('abcd');
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(firstAbort?.aborted).toBe(true);
  });

  it('renders results with section headers when API returns hits', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        query: 'foo',
        total: 2,
        results: {
          accounts: [{ id: 1, type: 'account', title: 'Foo Bank', meta: 'EUR', url: '/accounts/1' }],
          credentials: [{ id: 2, type: 'credential', title: 'Foo Creds', meta: 'prod', url: '/vault/2' }],
          transactions: [],
        },
      }),
    });
    renderSearch();
    act(() => setInput('foo'));
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(document.body.textContent).toContain('Accounts');
    expect(document.body.textContent).toContain('Foo Bank');
    expect(document.body.textContent).toContain('Foo Creds');
  });

  it('shows error state on fetch failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    renderSearch();
    act(() => setInput('foo'));
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Unexpected error');
  });

  it('clears any pending debounce timer on unmount (no leak)', () => {
    const { unmount } = renderSearch();
    act(() => setInput('xy'));
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('removes the document mousedown listener on unmount', () => {
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderSearch();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));
  });
});
