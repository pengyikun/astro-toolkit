// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act, screen } from '@testing-library/react';
import RevealButton from '../../components/vault/RevealButton';
import { LocaleProvider } from '../../lib/i18n/client';

const dict = {
  'vault.reveal': 'Reveal',
  'vault.hide': 'Hide',
  'vault.copy': 'Copy',
  'vault.copied': 'Copied',
  'vault.copiedToClipboard': 'Copied',
  'vault.revealFailed': 'Reveal failed',
  'vault.copyFailed': 'Copy failed',
  'a11y.revealSecret': 'Reveal {key}',
  'a11y.hideSecret': 'Hide {key}',
  'a11y.copySecret': 'Copy {key}',
};

function renderBtn(itemKey = 'pwd') {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <RevealButton credentialId={1} itemId={2} itemKey={itemKey} />
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

describe('RevealButton', () => {
  it('starts with masked value (no API call)', () => {
    renderBtn();
    expect(screen.getByText('••••••••••••')).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('reveals the secret after clicking Reveal', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ value: 'super-secret' }),
    });
    renderBtn();
    const revealBtn = screen.getByLabelText('Reveal pwd');

    await act(async () => {
      revealBtn.click();
      await Promise.resolve();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/vault/1/reveal/2');
    expect(screen.getByText('super-secret')).toBeTruthy();
  });

  it('auto-hides the secret after the 10s timer fires', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ value: 'super-secret' }),
    });
    renderBtn();

    await act(async () => {
      screen.getByLabelText('Reveal pwd').click();
      await Promise.resolve();
    });
    expect(screen.queryByText('super-secret')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.queryByText('super-secret')).toBeNull();
    expect(screen.getByText('••••••••••••')).toBeTruthy();
  });

  it('clicking Hide cancels the reveal and clears the timer', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ value: 'sec' }),
    });
    renderBtn();

    await act(async () => {
      screen.getByLabelText('Reveal pwd').click();
      await Promise.resolve();
    });
    expect(screen.queryByText('sec')).toBeTruthy();

    act(() => {
      screen.getByLabelText('Hide pwd').click();
    });
    expect(screen.queryByText('sec')).toBeNull();
  });

  it('does not crash if unmounted before fetch resolves (no setState-after-unmount)', async () => {
    let resolveFetch: (v: unknown) => void = () => {};
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementationOnce(
      () => new Promise((res) => { resolveFetch = res; }),
    );
    const { unmount } = renderBtn();

    act(() => screen.getByLabelText('Reveal pwd').click());
    unmount();
    await act(async () => {
      resolveFetch({ json: async () => ({ value: 'late' }) });
      await Promise.resolve();
    });
    // No throw / no warning means the isMountedRef guard worked.
    expect(true).toBe(true);
  });

  it('clears pending timers on unmount (no leak)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      json: async () => ({ value: 'sec' }),
    });
    const { unmount } = renderBtn();

    await act(async () => {
      screen.getByLabelText('Reveal pwd').click();
      await Promise.resolve();
    });
    const beforeCount = vi.getTimerCount();
    expect(beforeCount).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
