// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import SidebarToggle from '../../components/layout/SidebarToggle';
import { SidebarProvider, useSidebar } from '../../components/layout/SidebarContext';
import { LocaleProvider } from '../../lib/i18n/client';

afterEach(() => cleanup());

const dict = { 'ui.toggleNavigation': 'Toggle navigation' };

function Probe() {
  const { isMobileOpen } = useSidebar();
  return <div data-testid="open-state">{String(isMobileOpen)}</div>;
}

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <LocaleProvider locale={'en' as never} dict={dict as never}>
      <SidebarProvider>{ui}</SidebarProvider>
    </LocaleProvider>,
  );
}

describe('SidebarToggle', () => {
  it('renders a button with the localized aria-label', () => {
    const { container } = renderWithProviders(<SidebarToggle />);
    const button = container.querySelector('#sidebar-toggle') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-label')).toBe('Toggle navigation');
  });

  it('reflects mobile-open state via aria-expanded', () => {
    const { container } = renderWithProviders(
      <>
        <SidebarToggle />
        <Probe />
      </>,
    );
    const button = container.querySelector('#sidebar-toggle') as HTMLButtonElement;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    act(() => button.click());
    expect(button.getAttribute('aria-expanded')).toBe('true');
  });

  it('clicking toggles mobile-open state in shared context', () => {
    const { container, getByTestId } = renderWithProviders(
      <>
        <SidebarToggle />
        <Probe />
      </>,
    );
    const button = container.querySelector('#sidebar-toggle') as HTMLButtonElement;
    expect(getByTestId('open-state').textContent).toBe('false');
    act(() => button.click());
    expect(getByTestId('open-state').textContent).toBe('true');
    act(() => button.click());
    expect(getByTestId('open-state').textContent).toBe('false');
  });
});
