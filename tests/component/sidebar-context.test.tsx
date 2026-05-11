// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { SidebarProvider, useSidebar } from '../../components/layout/SidebarContext';

afterEach(() => cleanup());

function Probe() {
  const { isMobileOpen, isCollapsed, toggleMobile, setMobileOpen, toggleCollapsed } = useSidebar();
  return (
    <div>
      <div data-testid="mobile">{String(isMobileOpen)}</div>
      <div data-testid="collapsed">{String(isCollapsed)}</div>
      <button data-testid="toggle-mobile" onClick={toggleMobile}>tm</button>
      <button data-testid="open-mobile" onClick={() => setMobileOpen(true)}>om</button>
      <button data-testid="close-mobile" onClick={() => setMobileOpen(false)}>cm</button>
      <button data-testid="toggle-collapsed" onClick={toggleCollapsed}>tc</button>
    </div>
  );
}

describe('SidebarContext', () => {
  it('exposes initial state: not mobile-open, not collapsed', () => {
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );
    expect(screen.getByTestId('mobile').textContent).toBe('false');
    expect(screen.getByTestId('collapsed').textContent).toBe('false');
  });

  it('toggleMobile flips mobile-open state', () => {
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );
    act(() => {
      screen.getByTestId('toggle-mobile').click();
    });
    expect(screen.getByTestId('mobile').textContent).toBe('true');
    act(() => {
      screen.getByTestId('toggle-mobile').click();
    });
    expect(screen.getByTestId('mobile').textContent).toBe('false');
  });

  it('setMobileOpen sets state explicitly', () => {
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );
    act(() => {
      screen.getByTestId('open-mobile').click();
    });
    expect(screen.getByTestId('mobile').textContent).toBe('true');
    act(() => {
      screen.getByTestId('close-mobile').click();
    });
    expect(screen.getByTestId('mobile').textContent).toBe('false');
  });

  it('toggleCollapsed flips collapsed state independently', () => {
    render(
      <SidebarProvider>
        <Probe />
      </SidebarProvider>,
    );
    act(() => {
      screen.getByTestId('toggle-collapsed').click();
    });
    expect(screen.getByTestId('collapsed').textContent).toBe('true');
    expect(screen.getByTestId('mobile').textContent).toBe('false');
  });

  it('throws when useSidebar is used outside provider', () => {
    // Suppress React's expected error log for this case
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Probe />)).toThrow(/SidebarProvider/);
    } finally {
      console.error = original;
    }
  });

  it('callback identities are stable across re-renders', () => {
    const seen: Array<() => void> = [];
    function Capture() {
      const { toggleMobile } = useSidebar();
      seen.push(toggleMobile);
      return null;
    }
    const { rerender } = render(
      <SidebarProvider>
        <Capture />
      </SidebarProvider>,
    );
    rerender(
      <SidebarProvider>
        <Capture />
      </SidebarProvider>,
    );
    // First two captures share identity (no state change between them).
    expect(seen[0]).toBe(seen[1]);
  });
});
