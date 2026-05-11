// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, act, fireEvent } from '@testing-library/react';
import LanguageSwitcher from '../../components/layout/LanguageSwitcher';
import { LocaleProvider } from '../../lib/i18n/client';
import { locales } from '../../lib/i18n/types';

const refreshMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

const dict = { 'a11y.languageSwitcher': 'Language' };

function renderSwitcher(locale = 'en' as never) {
  return render(
    <LocaleProvider locale={locale} dict={dict as never}>
      <LanguageSwitcher />
    </LocaleProvider>,
  );
}

afterEach(() => {
  cleanup();
  refreshMock.mockReset();
  document.cookie = '';
});

describe('LanguageSwitcher', () => {
  it('renders one button per available locale', () => {
    const { container } = renderSwitcher();
    const buttons = container.querySelectorAll('button[role="radio"]');
    expect(buttons.length).toBe(locales.length);
  });

  it('marks the current locale as aria-checked', () => {
    const { container } = renderSwitcher('en' as never);
    const checked = container.querySelector('button[aria-checked="true"]');
    expect(checked).not.toBeNull();
  });

  it('clicking the same-locale button does NOT trigger refresh', () => {
    const { container } = renderSwitcher('en' as never);
    const enBtn = container.querySelector('button[aria-checked="true"]') as HTMLButtonElement;
    act(() => enBtn.click());
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it('clicking a different locale calls router.refresh and writes cookie', () => {
    if (locales.length < 2) return; // skip when only one locale configured
    const { container } = renderSwitcher(locales[0] as never);
    const buttons = container.querySelectorAll('button[role="radio"]');
    const other = buttons[1] as HTMLButtonElement;
    act(() => other.click());
    expect(refreshMock).toHaveBeenCalled();
    expect(document.cookie).toMatch(/locale=/);
  });

  it('arrow keys cycle to the next locale', () => {
    if (locales.length < 2) return;
    const { container } = renderSwitcher(locales[0] as never);
    const enBtn = container.querySelector('button[aria-checked="true"]') as HTMLButtonElement;
    fireEvent.keyDown(enBtn, { key: 'ArrowRight' });
    expect(refreshMock).toHaveBeenCalled();
  });

  it('ignores non-arrow keys', () => {
    const { container } = renderSwitcher();
    const enBtn = container.querySelector('button[aria-checked="true"]') as HTMLButtonElement;
    fireEvent.keyDown(enBtn, { key: 'Enter' });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
